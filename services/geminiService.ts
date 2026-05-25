import { DailyPlan, Meal, UserData, MacroData, Recipe, FoodItem, MonthlyDietPlan } from '../types';

async function rpcCall<T>(method: string, ...args: any[]): Promise<T> {
    const res = await fetch('/api/rpc', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ method, args }),
    });
    
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Server error');
    }
    
    const data = await res.json();
    return data.result;
}

export const parseMealPlanText = async (text: string): Promise<DailyPlan> => rpcCall('parseMealPlanText', text);
export const generateDailyPlan = async (userData: UserData, date: Date): Promise<DailyPlan> => rpcCall('generateDailyPlan', userData, date);
export const regenerateDailyPlan = async (userData: UserData, currentPlan: DailyPlan, numberOfMeals?: number): Promise<DailyPlan> => rpcCall('regenerateDailyPlan', userData, currentPlan, numberOfMeals);
export const adjustDailyPlanForMacro = async (userData: UserData, currentPlan: DailyPlan, macroToFix: keyof Omit<MacroData, 'calories'>): Promise<DailyPlan> => rpcCall('adjustDailyPlanForMacro', userData, currentPlan, macroToFix);
export const generateWeeklyPlan = async (userData: UserData, weekStartDate: Date, observation?: string): Promise<Record<string, DailyPlan>> => rpcCall('generateWeeklyPlan', userData, weekStartDate, observation);
export const generateMonthlyPlan = async (userData: UserData, observation?: string): Promise<MonthlyDietPlan> => rpcCall('generateMonthlyPlan', userData, observation);
export const regenerateMealFromPrompt = async (promptText: string, meal: Meal, userData: UserData): Promise<Meal> => rpcCall('regenerateMealFromPrompt', promptText, meal, userData);
export const getFoodSubstitution = async (itemToSwap: FoodItem, mealContext: Meal, userData: UserData): Promise<FoodItem> => rpcCall('getFoodSubstitution', itemToSwap, mealContext, userData);
export const findRecipes = async (query: string, userData: UserData, numRecipes: number = 3): Promise<Recipe[]> => rpcCall('findRecipes', query, userData, numRecipes);
export const generateImageFromPrompt = async (prompt: string): Promise<string> => rpcCall('generateImageFromPrompt', prompt);

// Stream is different
export async function* sendMessageToAI(message: string, history: any[]) {
    const res = await fetch('/api/rpc/stream', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, history }),
    });

    if (!res.ok) {
        throw new Error('Failed to stream from AI');
    }

    if (!res.body) throw new Error('No readable stream available');

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');

    let buffer = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
            const chunk = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            
            if (chunk.startsWith('data: ')) {
                const dataStr = chunk.slice(6).trim();
                if (dataStr === '[DONE]') return;
                if (dataStr) {
                    try {
                        yield JSON.parse(dataStr);
                    } catch (e) {
                         console.error('SSE parse error:', dataStr);
                    }
                }
            }
            boundary = buffer.indexOf('\n\n');
        }
    }
}

export const analyzeMealFromText = async (description: string): Promise<MacroData> => rpcCall('analyzeMealFromText', description);
export const analyzeMealFromImage = async (imageDataUrl: string): Promise<MacroData> => rpcCall('analyzeMealFromImage', imageDataUrl);
export const analyzeProgress = async (userData: UserData): Promise<string> => rpcCall('analyzeProgress', userData);
export const generateShoppingList = async (weekPlan: DailyPlan[]): Promise<string> => rpcCall('generateShoppingList', weekPlan);
export const getFoodInfo = async (question: string, mealContext?: Meal): Promise<string> => rpcCall('getFoodInfo', question, mealContext);
