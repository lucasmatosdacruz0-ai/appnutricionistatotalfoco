
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Content, Part, GenerateImagesResponse } from "@google/genai";

function buildUserProfile(userData: any): string {
    return `### Dados
- **Perfil:** ${userData.age} anos, ${userData.gender}, ${userData.weight}kg
- **Meta:** ${userData.weightGoal}kg (${userData.dietDifficulty})
- **Prefs:** ${userData.dietaryPreferences?.diets?.join(',') || 'Nenhuma'}
- **Restrições:** ${userData.dietaryPreferences?.restrictions?.join(',') || 'Nenhuma'}
- **Macros:** ${userData.macros.calories.goal}kcal (P:${userData.macros.protein.goal}g C:${userData.macros.carbs.goal}g G:${userData.macros.fat.goal}g)`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { action, payload } = req.body;
    if (!action) {
        return res.status(400).json({ error: "Action is required" });
    }

    if (!process.env.API_KEY) {
        console.error("API_KEY missing");
        return res.status(500).json({ error: "Server Error: API Key configuration missing." });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    try {
        let result: any;
        let prompt: string;
        let response;
        let text: string;

        // Using the fastest model available to prevent timeouts
        const textModel = 'gemini-2.5-flash';

        switch(action) {
            case 'sendMessageToAI':
                const { message, history } = payload;
                const contents: Content[] = history.map((h: any) => ({
                    role: h.sender === 'user' ? 'user' : 'model',
                    parts: [{ text: h.text }]
                }));
                contents.push({ role: 'user', parts: [{ text: message }] });

                const resultStream = await ai.models.generateContentStream({
                    model: textModel,
                    contents,
                });

                res.setHeader('Content-Type', 'application/octet-stream');
                
                for await (const chunk of resultStream) {
                    if (chunk.text) {
                        res.write(JSON.stringify({ text: chunk.text }) + '\n');
                    }
                }
                return res.end();

            case 'parseMealPlanText':
                prompt = `Extraia JSON do plano:\n${payload.text}`;
                response = await ai.models.generateContent({ model: textModel, contents: prompt, config: { responseMimeType: "application/json" } });
                text = response.text?.replace(/^```json\n?/, '').replace(/```$/, '') || "{}";
                result = JSON.parse(text);
                break;

            case 'generateDailyPlan':
                prompt = `Gere plano alimentar (1 dia) p/ data ${payload.dateString}. JSON rigoroso com macros.\n${buildUserProfile(payload.userData)}`;
                response = await ai.models.generateContent({ model: textModel, contents: prompt, config: { responseMimeType: "application/json" } });
                text = response.text?.replace(/^```json\n?/, '').replace(/```$/, '') || "{}";
                result = JSON.parse(text);
                break;

            case 'regenerateDailyPlan':
                prompt = `Novo plano alimentar p/ ${payload.currentPlan.date}. ${payload.numberOfMeals ? `${payload.numberOfMeals} refeições.` : ''}. JSON apenas.\n${buildUserProfile(payload.userData)}`;
                response = await ai.models.generateContent({ model: textModel, contents: prompt, config: { responseMimeType: "application/json" } });
                text = response.text?.replace(/^```json\n?/, '').replace(/```$/, '') || "{}";
                result = JSON.parse(text);
                break;

            case 'adjustDailyPlanForMacro':
                prompt = `Ajuste plano p/ meta ${payload.macroToFix}. JSON apenas.\n${JSON.stringify(payload.currentPlan)}`;
                response = await ai.models.generateContent({ model: textModel, contents: prompt, config: { responseMimeType: "application/json" } });
                text = response.text?.replace(/^```json\n?/, '').replace(/```$/, '') || "{}";
                result = JSON.parse(text);
                break;

            case 'generateWeeklyPlan':
                // CRITICAL OPTIMIZATION: Generate fewer days or simplified structure to avoid Vercel 10s timeout.
                // We ask for 5 days instead of 7 to ensure speed, or just succinct JSON.
                prompt = `Gere plano alimentar de 5 dias (${payload.weekStartDate} em diante). 
                ${payload.observation ? `Obs: ${payload.observation}`: ''}
                IMPORTANTE:
                - Retorne ARRAY JSON de objetos DailyPlan.
                - Descrições curtas (max 5 palavras por item).
                - Otimize para velocidade de resposta.
                \n${buildUserProfile(payload.userData)}`;
                
                response = await ai.models.generateContent({ 
                    model: textModel, 
                    contents: prompt, 
                    config: { 
                        responseMimeType: "application/json",
                        maxOutputTokens: 4000 // Reduced token limit to force conciseness
                    } 
                });
                
                text = response.text?.replace(/^```json\n?/, '').replace(/```$/, '') || "[]";
                
                let plans: any[] = [];
                try {
                    const parsed = JSON.parse(text);
                    if (Array.isArray(parsed)) plans = parsed;
                    else if (parsed.days) plans = parsed.days;
                    else if (typeof parsed === 'object') {
                         const foundArray = Object.values(parsed).find((v: any) => Array.isArray(v));
                         if (foundArray) plans = foundArray as any[];
                    }
                } catch (e) {
                    throw new Error("Erro ao processar resposta da IA.");
                }
                
                const planResult: Record<string, any> = {};
                plans.forEach((dayPlan: any) => {
                    if (dayPlan?.date) planResult[dayPlan.date] = dayPlan;
                });
                result = planResult;
                break;

            case 'regenerateMealFromPrompt':
                prompt = `Regenere refeição "${payload.meal.name}": "${payload.prompt}". JSON apenas.\n${buildUserProfile(payload.userData)}`;
                response = await ai.models.generateContent({ model: textModel, contents: prompt, config: { responseMimeType: "application/json" } });
                text = response.text?.replace(/^```json\n?/, '').replace(/```$/, '') || "{}";
                result = JSON.parse(text);
                break;

            case 'analyzeMealFromText':
                prompt = `Analise macros: ${payload.description}. JSON apenas.`;
                response = await ai.models.generateContent({ model: textModel, contents: prompt, config: { responseMimeType: "application/json" } });
                text = response.text?.replace(/^```json\n?/, '').replace(/```$/, '') || "{}";
                result = JSON.parse(text);
                break;

            case 'analyzeMealFromImage':
                const { imageDataUrl } = payload;
                const [header, base64Data] = imageDataUrl.split(',');
                const mimeTypeMatch = header.match(/:(.*?);/);
                
                const imagePart: Part = { inlineData: { mimeType: mimeTypeMatch?.[1] || 'image/jpeg', data: base64Data } };
                const textPart: Part = { text: "Estime macros. Retorne JSON apenas." };
                
                response = await ai.models.generateContent({ model: textModel, contents: { parts: [textPart, imagePart] }, config: { responseMimeType: "application/json" } });
                text = response.text?.replace(/^```json\n?/, '').replace(/```$/, '') || "{}";
                result = JSON.parse(text);
                break;

            case 'analyzeProgress':
                prompt = `Resumo motivacional curto sobre progresso.\n${buildUserProfile(payload.userData)}`;
                response = await ai.models.generateContent({ model: textModel, contents: prompt });
                result = response.text;
                break;

            case 'generateShoppingList':
                prompt = `Lista de compras curta em Markdown.\n${JSON.stringify(payload.weekPlan)}`;
                response = await ai.models.generateContent({ model: textModel, contents: prompt });
                result = response.text;
                break;

            case 'getFoodInfo':
                prompt = `Responda curto (max 50 palavras): "${payload.question}"`;
                response = await ai.models.generateContent({ model: textModel, contents: prompt });
                result = response.text;
                break;

            case 'getFoodSubstitution':
                prompt = `Substituto para "${payload.itemToSwap.name}". JSON apenas.`;
                response = await ai.models.generateContent({ model: textModel, contents: prompt, config: { responseMimeType: "application/json" } });
                text = response.text?.replace(/^```json\n?/, '').replace(/```$/, '') || "{}";
                result = JSON.parse(text);
                break;

            case 'generateImageFromPrompt':
                const imageResponse: GenerateImagesResponse = await ai.models.generateImages({ 
                    model: 'imagen-4.0-generate-001', 
                    prompt: payload.prompt, 
                    config: { numberOfImages: 1, outputMimeType: 'image/jpeg' } 
                });
                result = imageResponse.generatedImages?.[0]?.image?.imageBytes;
                if (!result) throw new Error("Falha na geração de imagem.");
                break;

            case 'findRecipes':
                prompt = `3 receitas curtas para: "${payload.query}". Inclua 'imagePrompt'. JSON Array.\n${buildUserProfile(payload.userData)}`;
                response = await ai.models.generateContent({ model: textModel, contents: prompt, config: { responseMimeType: "application/json" } });
                text = response.text?.replace(/^```json\n?/, '').replace(/```$/, '') || "[]";
                result = JSON.parse(text);
                break;

            default:
                return res.status(400).json({ error: "Invalid action" });
        }
        
        return res.status(200).json({ result });

    } catch (error: any) {
        console.error(`API ERROR in action '${action}':`, error);
        const message = error.message || "Internal Server Error";
        return res.status(500).json({ error: message });
    }
}
