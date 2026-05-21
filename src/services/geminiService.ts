import { GoogleGenAI, Part } from "@google/genai";
import { DailyPlan, Meal, UserData, MacroData, Recipe, FoodItem } from '../types';
import { sanitizeRecipe, sanitizeDailyPlan } from "../components/utils/sanitizers";

// Initialize the client directly using the env variable.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to build the user profile string for prompts
function buildUserProfile(userData: UserData): string {
    const diets = userData.dietaryPreferences?.diets?.join(', ') || 'Nenhuma';
    const restrictions = userData.dietaryPreferences?.restrictions?.join(', ') || 'Nenhuma';
    
    return `PERFIL DO USUÁRIO:
    - Idade/Gênero: ${userData.age} anos, ${userData.gender}
    - Peso/Meta: ${userData.weight}kg -> ${userData.weightGoal}kg
    - Atividade: ${userData.activityLevel}
    - Preferências: ${diets}
    - Restrições: ${restrictions}
    - Macros Alvo: ${userData.macros.calories.goal}kcal (P:${userData.macros.protein.goal}g, C:${userData.macros.carbs.goal}g, G:${userData.macros.fat.goal}g)`;
}

/**
 * Helper robusto para extrair JSON de respostas da IA que podem conter Markdown ou texto.
 */
async function generateJson<T>(prompt: string | { parts: Part[] }, model: string = 'gemini-2.5-flash'): Promise<T> {
    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { 
                responseMimeType: "application/json",
                temperature: 0.4, // Menor criatividade para garantir estrutura
            }
        });

        const text = response.text || "{}";
        
        // 1. Tenta encontrar um bloco JSON explícito (objeto {} ou array [])
        // O regex procura o primeiro { ou [ até o último } ou ]
        const jsonMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        let jsonString = jsonMatch ? jsonMatch[0] : text;

        // 2. Limpeza de resíduos de markdown caso o regex tenha pego bordas
        jsonString = jsonString
            .replace(/^```json\s*/g, '')
            .replace(/^```\s*/g, '')
            .replace(/```$/g, '')
            .trim();

        if (!jsonString) throw new Error("Resposta vazia da IA");

        return JSON.parse(jsonString) as T;
    } catch (error) {
        console.error("Gemini JSON Generation Error:", error);
        throw new Error("Falha ao processar resposta da IA. Tente novamente.");
    }
}

// --- PLANOS ALIMENTARES ---

export const parseMealPlanText = async (text: string): Promise<DailyPlan> => {
    const prompt = `Analise o texto abaixo e converta-o em um objeto JSON estrito seguindo a estrutura de 'DailyPlan'.
    Texto: "${text}"
    
    Estrutura JSON Obrigatória:
    {
      "date": "YYYY-MM-DD",
      "dayOfWeek": "string",
      "meals": [
        { "id": "uuid", "name": "string", "time": "HH:MM", "items": [{"name": "string", "portion": "string", "calories": number, "carbs": number, "protein": number, "fat": number}], "totalCalories": number, "totalMacros": { "calories": number, "carbs": number, "protein": number, "fat": number } }
      ],
      "totalCalories": number,
      "totalMacros": { "calories": number, "carbs": number, "protein": number, "fat": number },
      "waterGoal": number
    }`;
    const raw = await generateJson<any>(prompt);
    const sanitized = sanitizeDailyPlan(raw);
    if (!sanitized) throw new Error("Falha ao ler plano.");
    return sanitized;
};

export const generateDailyPlan = async (userData: UserData, date: Date): Promise<DailyPlan> => {
    const dateString = date.toISOString().split('T')[0];
    const userProfile = buildUserProfile(userData);
    
    const prompt = `Atue como nutricionista. Crie um plano alimentar completo (1 dia) para ${dateString}.
    ${userProfile}
    
    RETORNE APENAS JSON VÁLIDO. Estrutura:
    {
      "date": "${dateString}",
      "dayOfWeek": "Nome do dia",
      "waterGoal": 2.5,
      "meals": [
        {
          "id": "m1", "name": "Café da Manhã", "time": "08:00",
          "items": [ { "name": "Alimento", "portion": "Qtd", "calories": 0, "carbs": 0, "protein": 0, "fat": 0 } ]
        },
        ... (Almoço, Lanche, Jantar)
      ]
    }`;
    
    const raw = await generateJson<any>(prompt);
    // A IA pode retornar o plano direto ou embrulhado em { "plan": ... }
    const planData = raw.dailyPlan || raw.plan || raw;
    const sanitized = sanitizeDailyPlan(planData);
    if (!sanitized) throw new Error("Formato de plano inválido gerado pela IA.");
    return sanitized;
};

export const regenerateDailyPlan = async (userData: UserData, currentPlan: DailyPlan, numberOfMeals?: number): Promise<DailyPlan> => {
    const prompt = `Refaça este plano alimentar para variar, mantendo os macros e a data (${currentPlan.date}).
    ${numberOfMeals ? `Gere exatamente ${numberOfMeals} refeições.` : ''}
    ${buildUserProfile(userData)}
    
    Retorne JSON seguindo a mesma estrutura de DailyPlan.`;
    
    const raw = await generateJson<any>(prompt);
    const sanitized = sanitizeDailyPlan(raw);
    if (!sanitized) throw new Error("Falha ao regenerar plano.");
    return sanitized;
};

export const adjustDailyPlanForMacro = async (userData: UserData, currentPlan: DailyPlan, macroToFix: keyof Omit<MacroData, 'calories'>): Promise<DailyPlan> => {
    const planStr = JSON.stringify(currentPlan).slice(0, 5000); 
    const prompt = `Ajuste este plano para atingir melhor a meta de ${macroToFix}.
    Perfil: ${buildUserProfile(userData)}
    Plano Atual (JSON): ${planStr}
    
    Retorne o JSON do plano ajustado completo.`;
    
    const raw = await generateJson<any>(prompt);
    const sanitized = sanitizeDailyPlan(raw);
    if (!sanitized) throw new Error("Falha ao ajustar plano.");
    return sanitized;
};

export const generateWeeklyPlan = async (userData: UserData, weekStartDate: Date, observation?: string): Promise<Record<string, DailyPlan>> => {
    const dateString = weekStartDate.toISOString().split('T')[0];
    const userProfile = buildUserProfile(userData);
    
    // Otimização: Pedir 5 dias em um array JSON simples para evitar timeout
    const prompt = `Gere uma dieta de 5 dias (Array JSON) começando em ${dateString}.
    ${userProfile}
    ${observation ? `Obs: ${observation}`: ''}
    
    IMPORTANTE: Retorne um ARRAY JSON onde cada item é um objeto DailyPlan completo.
    Estrutura: [ { "date": "YYYY-MM-DD", "meals": [...] }, ... ]
    Seja breve nas descrições.`;

    const raw = await generateJson<any>(prompt);
    
    let plansArray: any[] = [];
    if (Array.isArray(raw)) plansArray = raw;
    else if (raw.days) plansArray = raw.days;
    else if (raw.plans) plansArray = raw.plans;
    else if (raw.weeklyPlan) plansArray = raw.weeklyPlan;
    
    const result: Record<string, DailyPlan> = {};
    plansArray.forEach((dayPlan: any) => {
        const sanitized = sanitizeDailyPlan(dayPlan);
        if (sanitized && sanitized.date) {
            result[sanitized.date] = sanitized;
        }
    });
    
    return result;
};

// --- REFEIÇÕES E ITENS ---

export const regenerateMealFromPrompt = async (promptText: string, meal: Meal, userData: UserData): Promise<Meal> => {
    const prompt = `Modifique esta refeição ("${meal.name}"): "${promptText}".
    ${buildUserProfile(userData)}
    Retorne JSON da Refeição: { "id": "${meal.id}", "name": "...", "time": "...", "items": [...], "totalCalories": 0, "totalMacros": {...} }`;
    
    const raw = await generateJson<any>(prompt);
    
    // Pequena sanitização local para garantir estrutura antes de retornar
    if (raw && !raw.items) raw.items = [];
    if (raw && !raw.totalMacros) raw.totalMacros = { calories: 0, carbs: 0, protein: 0, fat: 0 };
    
    return raw as Meal;
};

export const getFoodSubstitution = async (itemToSwap: FoodItem, mealContext: Meal, userData: UserData): Promise<FoodItem> => {
    const prompt = `Sugira um substituto saudável para "${itemToSwap.name}" (${itemToSwap.calories}kcal) na refeição "${mealContext.name}".
    Retorne JSON (FoodItem): { "name": "...", "portion": "...", "calories": 0, "carbs": 0, "protein": 0, "fat": 0 }`;
    return generateJson<FoodItem>(prompt);
};

// --- RECEITAS ---

export const findRecipes = async (query: string, userData: UserData, numRecipes: number = 3): Promise<Recipe[]> => {
    const userProfile = buildUserProfile(userData);
    
    const prompt = `Encontre ${numRecipes} receitas saudáveis para: "${query}".
    ${userProfile}
    
    FORMATO JSON OBRIGATÓRIO (Array):
    [
      {
        "id": "r1",
        "title": "Nome da Receita",
        "description": "Descrição curta",
        "prepTime": "30 min",
        "difficulty": "Fácil",
        "servings": "2 pessoas",
        "ingredients": ["ingrediente 1", "ingrediente 2"],
        "instructions": ["passo 1", "passo 2"],
        "nutritionalInfo": {
           "calories": "400 kcal",
           "protein": "30g",
           "carbs": "40g",
           "fat": "15g"
        },
        "imagePrompt": "Descrição visual da comida em inglês"
      }
    ]
    
    Retorne APENAS o JSON.`;
    
    const raw = await generateJson<any>(prompt);
    let recipes: any[] = [];
    
    if (Array.isArray(raw)) recipes = raw;
    else if (raw.recipes) recipes = raw.recipes;
    
    // Aplica sanitização IMEDIATAMENTE para evitar erros no frontend
    return recipes.map(sanitizeRecipe).filter(Boolean);
};

export const generateImageFromPrompt = async (prompt: string): Promise<string> => {
    try {
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: { numberOfImages: 1, outputMimeType: 'image/jpeg' }
        });

        const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
        if (!imageBytes) throw new Error("A IA não retornou imagem.");
        
        return `data:image/jpeg;base64,${imageBytes}`;
    } catch (error) {
        console.error("Image Gen Error:", error);
        throw new Error("Falha ao gerar imagem.");
    }
};

// --- CHAT E OUTROS ---

export async function* sendMessageToAI(message: string, history: any[]) {
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
        if (chunk.text) yield { text: chunk.text };
    }
}

export const analyzeMealFromText = async (description: string): Promise<MacroData> => {
    const prompt = `Analise os macros de: "${description}". Retorne JSON: { "calories": 0, "carbs": 0, "protein": 0, "fat": 0 } (apenas números)`;
    return generateJson<MacroData>(prompt);
};

export const analyzeMealFromImage = async (imageDataUrl: string): Promise<MacroData> => {
    const [header, base64Data] = imageDataUrl.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
    
    const prompt = "Analise os macros desta comida. Retorne JSON: { calories, carbs, protein, fat } (números).";
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ inlineData: { mimeType, data: base64Data } }, { text: prompt }] },
        config: { responseMimeType: "application/json" }
    });
    
    const text = response.text?.replace(/^```json|```$/g, '').trim() || "{}";
    return JSON.parse(text);
};

export const analyzeProgress = async (userData: UserData): Promise<string> => {
    const prompt = `Analise o progresso. Resumo curto e motivador.\n${buildUserProfile(userData)}`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text || "";
};

export const generateShoppingList = async (weekPlan: DailyPlan[]): Promise<string> => {
    const simplified = weekPlan.map(d => `${d.dayOfWeek}: ${d.meals.map(m => m.name).join(', ')}`);
    const prompt = `Gere lista de compras Markdown com checkboxes baseada nestes dias: ${JSON.stringify(simplified)}`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text || "";
};

export const getFoodInfo = async (question: string, mealContext?: Meal): Promise<string> => {
    const prompt = `Responda curto (max 60 palavras): "${question}" ${mealContext ? `(Contexto: ${mealContext.name})` : ''}`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text || "";
};