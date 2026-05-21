import { GoogleGenAI, Part } from "@google/genai";
import { DailyPlan, Meal, UserData, MacroData, Recipe, FoodItem } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

function buildUserProfile(userData: UserData): string {
    return `### Dados do Usuário
- **Idade:** ${userData.age}, **Gênero:** ${userData.gender}, **Altura:** ${userData.height} cm, **Peso Atual:** ${userData.weight} kg
- **Nível de Atividade:** ${userData.activityLevel}, **Meta de Peso:** ${userData.weightGoal} kg
- **Preferências:** ${userData.dietaryPreferences?.diets?.join(', ') || 'Nenhuma'}, **Restrições:** ${userData.dietaryPreferences?.restrictions?.join(', ') || 'Nenhuma'}
- **Metas Macros:** Calorias: ${userData.macros.calories.goal} kcal, Proteínas: ${userData.macros.protein.goal} g, Carboidratos: ${userData.macros.carbs.goal} g, Gorduras: ${userData.macros.fat.goal} g`;
}

async function generateJson<T>(prompt: string | { parts: Part[] }, model: string = 'gemini-2.5-flash'): Promise<T> {
    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { 
                responseMimeType: "application/json",
            }
        });

        const text = response.text?.replace(/^```json\n?/, '').replace(/```$/, '') || "{}";
        return JSON.parse(text) as T;
    } catch (error) {
        console.error("Gemini JSON Generation Error:", error);
        throw new Error("Falha ao processar resposta da IA. Tente novamente.");
    }
}

export const parseMealPlanText = async (text: string): Promise<DailyPlan> => {
    const prompt = `Extraia JSON do plano alimentar abaixo. O formato deve corresponder à interface DailyPlan. Responda APENAS com o JSON.\n\nTexto:\n${text}`;
    return generateJson<DailyPlan>(prompt);
};

export const generateDailyPlan = async (userData: UserData, date: Date): Promise<DailyPlan> => {
    const dateString = date.toISOString().split('T')[0];
    const userProfile = buildUserProfile(userData);
    const prompt = `Gere um plano alimentar completo (1 dia) para a data ${dateString}. O plano deve ser detalhado, alinhado com as metas. Calcule os totais de calorias e macros. Responda APENAS com o JSON.\n${userProfile}`;
    return generateJson<DailyPlan>(prompt);
};

export const regenerateDailyPlan = async (userData: UserData, currentPlan: DailyPlan, numberOfMeals?: number): Promise<DailyPlan> => {
    const userProfile = buildUserProfile(userData);
    const prompt = `Gere um novo plano alimentar para a data ${currentPlan.date}. ${numberOfMeals ? `O plano deve ter exatamente ${numberOfMeals} refeições.` : ''} O plano deve ser uma alternativa ao original, mantendo as mesmas metas. Responda APENAS com o JSON.\n${userProfile}`;
    return generateJson<DailyPlan>(prompt);
};

export const adjustDailyPlanForMacro = async (userData: UserData, currentPlan: DailyPlan, macroToFix: keyof Omit<MacroData, 'calories'>): Promise<DailyPlan> => {
    const userProfile = buildUserProfile(userData);
    // Limit plan string length to avoid token limits if plan is large
    const planStr = JSON.stringify(currentPlan).slice(0, 10000); 
    const prompt = `Ajuste este plano alimentar para se aproximar mais da meta de ${macroToFix}. Mantenha as calorias totais o mais próximo possível da meta. Plano original:\n${planStr}\n${userProfile}\n Responda APENAS com o JSON do plano ajustado.`;
    return generateJson<DailyPlan>(prompt);
};

export const generateWeeklyPlan = async (userData: UserData, weekStartDate: Date, observation?: string): Promise<Record<string, DailyPlan>> => {
    const dateString = weekStartDate.toISOString().split('T')[0];
    const userProfile = buildUserProfile(userData);
    
    const prompt = `Gere plano alimentar de 7 dias (${dateString} em diante). 
    ${observation ? `Obs: ${observation}`: ''}
    IMPORTANTE:
    - Retorne um ARRAY JSON de objetos DailyPlan.
    - Para economizar tokens, use descrições curtas para os itens (max 5-6 palavras).
    - Otimize para velocidade.
    \n${userProfile}`;

    const rawPlans = await generateJson<any[]>(prompt);
    
    const result: Record<string, DailyPlan> = {};
    let plans: any[] = [];

    if (Array.isArray(rawPlans)) plans = rawPlans;
    else if ((rawPlans as any).days) plans = (rawPlans as any).days;
    else if ((rawPlans as any).plans) plans = (rawPlans as any).plans;
    else if (typeof rawPlans === 'object') {
         const foundArray = Object.values(rawPlans).find((v: any) => Array.isArray(v));
         if (foundArray) plans = foundArray as any[];
    }

    plans.forEach((dayPlan: any) => {
        if (dayPlan && dayPlan.date) {
            result[dayPlan.date] = dayPlan;
        }
    });
    
    return result;
};

export const regenerateMealFromPrompt = async (promptText: string, meal: Meal, userData: UserData): Promise<Meal> => {
    const userProfile = buildUserProfile(userData);
    const prompt = `Regenere a refeição "${meal.name}" com base na instrução: "${promptText}". Calcule novos totais de calorias/macros. Responda APENAS com o JSON.\n${userProfile}`;
    return generateJson<Meal>(prompt);
};

export const analyzeMealFromText = async (description: string): Promise<MacroData> => {
    const prompt = `Analise esta descrição de refeição e retorne estimativa de macronutrientes (calories, carbs, protein, fat). Responda APENAS com o JSON.\n\nDescrição: ${description}`;
    return generateJson<MacroData>(prompt);
};

export const analyzeMealFromImage = async (imageDataUrl: string): Promise<MacroData> => {
    const [header, base64Data] = imageDataUrl.split(',');
    const mimeTypeMatch = header.match(/:(.*?);/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';

    const imagePart = {
        inlineData: {
            data: base64Data,
            mimeType: mimeType
        }
    };

    const prompt = "Analise esta imagem de comida. Estime os macronutrientes totais (calorias, carboidratos, proteínas, gorduras). Retorne APENAS um JSON com as chaves: calories, carbs, protein, fat. Valores numéricos.";
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [imagePart, { text: prompt }] },
        config: { responseMimeType: "application/json" }
    });

    const text = response.text?.replace(/^```json\n?/, '').replace(/```$/, '') || "{}";
    return JSON.parse(text);
};

export const analyzeProgress = async (userData: UserData): Promise<string> => {
    const userProfile = buildUserProfile(userData);
    const prompt = `Analise os dados de progresso do usuário (peso, histórico, metas) e forneça um resumo motivacional curto com 2-3 dicas práticas. Fale diretamente com o usuário (você).\n${userProfile}`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text || "Não foi possível gerar a análise.";
};

export const generateShoppingList = async (weekPlan: DailyPlan[]): Promise<string> => {
    const simplifiedPlan = weekPlan.map(d => ({
        day: d.dayOfWeek,
        meals: d.meals.map(m => m.items.map(i => i.name).join(', '))
    }));

    const prompt = `Crie uma lista de compras organizada por categorias (ex: Hortifruti, Carnes, Mercearia) baseada neste plano. Use formato Markdown (checkboxes). \n${JSON.stringify(simplifiedPlan)}`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text || "Erro ao gerar lista.";
};

export const getFoodInfo = async (question: string, mealContext?: Meal): Promise<string> => {
    const prompt = `Responda à dúvida sobre alimentos de forma clara e concisa (max 80 palavras). Pergunta: "${question}" ${mealContext ? `\nContexto da refeição: ${mealContext.name} - ${mealContext.items.map(i => i.name).join(', ')}` : ''}`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return response.text || "Sem resposta.";
};

export const getFoodSubstitution = async (itemToSwap: FoodItem, mealContext: Meal, userData: UserData): Promise<FoodItem> => {
    const userProfile = buildUserProfile(userData);
    const prompt = `Sugira um substituto saudável para o item "${itemToSwap.name}" na refeição "${mealContext.name}". O substituto deve ter macros similares ou melhores para a meta. Responda APENAS com o JSON do novo FoodItem.\n${userProfile}`;
    return generateJson<FoodItem>(prompt);
};

export const generateImageFromPrompt = async (prompt: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
             parts: [{ text: prompt }]
        }
    });

    if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
    }
    
    throw new Error("Não foi possível gerar a imagem.");
};

export const findRecipes = async (query: string, userData: UserData, numRecipes: number = 3): Promise<Recipe[]> => {
    const userProfile = buildUserProfile(userData);
    const prompt = `Encontre ${numRecipes} receitas saudáveis para a busca: "${query}". 
    Para cada receita, inclua um campo 'imagePrompt' visualmente descritivo em inglês para gerar uma foto do prato.
    Retorne um ARRAY JSON de objetos Recipe.\n${userProfile}`;
    
    return generateJson<Recipe[]>(prompt);
};

export async function* sendMessageToAI(message: string, history: any[]): AsyncGenerator<{ text: string }, void, unknown> {
    try {
        const contents = history.map((h: any) => ({
            role: h.sender === 'user' ? 'user' : 'model',
            parts: [{ text: h.text }]
        }));
        
        contents.push({ role: 'user', parts: [{ text: message }] });

        const resultStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents,
        });

        for await (const chunk of resultStream) {
            if (chunk.text) {
                yield { text: chunk.text };
            }
        }
    } catch (error) {
        console.error("Gemini Chat Error:", error);
        throw new Error("Erro na conexão com o chat.");
    }
}
