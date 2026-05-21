import { DailyPlan, FoodItem, Meal, Recipe, NutritionalInfo } from '../types';

/**
 * Garante que o valor seja uma string. Retorna um fallback se for null/undefined.
 */
const safeString = (val: any, fallback: string = 'N/A'): string => {
    if (val === null || val === undefined) return fallback;
    return String(val).trim() || fallback;
};

/**
 * Garante que o valor seja um número. Retorna 0 se for inválido.
 */
const safeNumber = (val: any): number => {
    const num = parseFloat(val);
    return isNaN(num) ? 0 : num;
};

export const sanitizeFoodItem = (item: any): FoodItem | null => {
    if (!item || typeof item !== 'object') return null;
    return {
        name: safeString(item.name, 'Alimento'),
        portion: safeString(item.portion, '1 porção'),
        calories: safeNumber(item.calories),
        carbs: safeNumber(item.carbs),
        protein: safeNumber(item.protein),
        fat: safeNumber(item.fat),
    };
};

export const sanitizeMeal = (meal: any): Meal | null => {
    if (!meal || typeof meal !== 'object') return null;
    
    const itemsRaw = Array.isArray(meal.items) ? meal.items : [];
    const items = itemsRaw.map(sanitizeFoodItem).filter(Boolean) as FoodItem[];
    
    // Recalcula totais para garantir consistência se a IA errar a soma
    const totalMacros = items.reduce((acc, item) => ({
        calories: acc.calories + item.calories,
        carbs: acc.carbs + item.carbs,
        protein: acc.protein + item.protein,
        fat: acc.fat + item.fat
    }), { calories: 0, carbs: 0, protein: 0, fat: 0 });

    // Usa valores da IA se existirem e forem válidos, senão usa o calculado
    const aiCalories = safeNumber(meal.totalCalories);
    
    return {
        id: safeString(meal.id, `meal-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`),
        name: safeString(meal.name, 'Refeição'),
        time: safeString(meal.time, '00:00'),
        items,
        totalCalories: aiCalories > 0 ? aiCalories : Math.round(totalMacros.calories),
        totalMacros: {
            calories: aiCalories > 0 ? aiCalories : Math.round(totalMacros.calories),
            carbs: Math.round(totalMacros.carbs),
            protein: Math.round(totalMacros.protein),
            fat: Math.round(totalMacros.fat)
        }
    };
};

export const sanitizeDailyPlan = (plan: any): DailyPlan | null => {
    if (!plan || typeof plan !== 'object') return null;
    
    const mealsRaw = Array.isArray(plan.meals) ? plan.meals : [];
    const meals = mealsRaw.map(sanitizeMeal).filter(Boolean) as Meal[];
    
    const dayMacros = meals.reduce((acc, meal) => ({
        calories: acc.calories + meal.totalCalories,
        carbs: acc.carbs + meal.totalMacros.carbs,
        protein: acc.protein + meal.totalMacros.protein,
        fat: acc.fat + meal.totalMacros.fat
    }), { calories: 0, carbs: 0, protein: 0, fat: 0 });

    return {
        date: safeString(plan.date, new Date().toISOString().split('T')[0]),
        dayOfWeek: safeString(plan.dayOfWeek, 'Dia'),
        meals,
        totalCalories: Math.round(dayMacros.calories),
        totalMacros: {
            calories: Math.round(dayMacros.calories),
            carbs: Math.round(dayMacros.carbs),
            protein: Math.round(dayMacros.protein),
            fat: Math.round(dayMacros.fat)
        },
        waterGoal: safeNumber(plan.waterGoal) || 2.5,
        title: safeString(plan.title, undefined),
        notes: safeString(plan.notes, undefined)
    };
};

export const sanitizeRecipe = (recipe: any): Recipe => {
    // 1. Estrutura padrão de segurança para evitar undefined.calories
    const fallbackInfo: NutritionalInfo = {
        calories: 'N/A',
        protein: 'N/A',
        carbs: 'N/A',
        fat: 'N/A'
    };

    // 2. Se a receita for nula/indefinida, retorna um placeholder seguro
    if (!recipe || typeof recipe !== 'object') {
        return {
            id: `error-${Date.now()}`,
            title: 'Erro ao carregar',
            description: 'Dados inválidos recebidos.',
            prepTime: '-',
            difficulty: 'Fácil',
            servings: '-',
            ingredients: [],
            instructions: [],
            nutritionalInfo: fallbackInfo,
            imagePrompt: ''
        };
    }
    
    // 3. Extração segura de informações nutricionais
    // A IA pode retornar 'macros', 'nutritionalInfo' ou propriedades soltas.
    let rawInfo = recipe.nutritionalInfo || recipe.macros || {};
    if (typeof rawInfo !== 'object') rawInfo = {};
    
    // Normaliza para string, pois a interface Recipe espera strings (ex: "400 kcal")
    const safeNutritionalInfo: NutritionalInfo = {
        calories: safeString(rawInfo.calories || recipe.calories),
        protein: safeString(rawInfo.protein || recipe.protein),
        carbs: safeString(rawInfo.carbs || recipe.carbohydrates || recipe.carbs),
        fat: safeString(rawInfo.fat || recipe.fat)
    };

    // 4. Construção do objeto final garantido
    return {
        id: safeString(recipe.id, `gen-${Math.random().toString(36).substr(2, 9)}`),
        title: safeString(recipe.title, 'Receita Sem Título'),
        description: safeString(recipe.description, 'Sem descrição disponível.'),
        prepTime: safeString(recipe.prepTime, 'N/A'),
        difficulty: (['Fácil', 'Médio', 'Difícil'].includes(recipe.difficulty) ? recipe.difficulty : 'Fácil') as any,
        servings: safeString(recipe.servings, '1 porção'),
        ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients.map((i: any) => safeString(i)) : [],
        instructions: Array.isArray(recipe.instructions) ? recipe.instructions.map((i: any) => safeString(i)) : [],
        nutritionalInfo: safeNutritionalInfo,
        imagePrompt: safeString(recipe.imagePrompt, `Foto profissional de ${recipe.title || 'comida'}`),
        generatedImage: recipe.generatedImage
    };
};