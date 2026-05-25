import React, { FC } from 'react';
import { DailyPlan, View } from '../types';
import { BowlIcon } from './icons/BowlIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';

interface TodaysDietCardProps {
    plan: DailyPlan | null;
    setActiveView: (view: View) => void;
    className?: string;
    isDark?: boolean;
}

const TodaysDietCard: FC<TodaysDietCardProps> = ({ plan, setActiveView, className = '', isDark }) => {
    return (
        <div className={`backdrop-blur-sm p-5 rounded-2xl shadow-sm border flex flex-col transition-all duration-300 ${
            isDark 
                ? "bg-slate-800/80 border-slate-750 text-slate-100" 
                : "bg-white/80 border-gray-100 text-slate-800"
        } ${className}`}>
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center transition-colors ${
                        isDark ? "bg-slate-700" : "bg-brand-green-light"
                    }`}>
                        <CalendarIcon className={`${isDark ? "text-brand-green" : "text-brand-green"} w-6 h-6`} />
                    </div>
                    <div>
                        <h3 className={`font-bold text-lg transition-colors ${
                            isDark ? "text-slate-150" : "text-slate-800"
                        }`}>Dieta de Hoje</h3>
                        <p className={`text-sm transition-colors ${
                            isDark ? "text-slate-400" : "text-slate-500"
                        }`}>
                            {plan ? `${Math.round(plan.totalCalories)} kcal planejadas` : "Nenhum plano para hoje."}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setActiveView('Dieta')}
                    className={`border text-sm font-semibold transition-colors px-3 py-2 rounded-lg flex-shrink-0 flex items-center gap-2 cursor-pointer ${
                        isDark 
                            ? "bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-650"
                            : "bg-white border-gray-300 text-slate-700 hover:bg-gray-100"
                    }`}
                >
                    Ver Dieta <ChevronRightIcon className="w-4 h-4" />
                </button>
            </div>
            {plan ? (
                <ul className="space-y-2 text-sm flex-grow">
                    {plan.meals.slice(0, 4).map(meal => (
                        <li key={meal.id} className={`flex justify-between items-center group py-1 border-b last:border-b-0 transition-colors ${
                            isDark ? "border-slate-700/60" : "border-gray-100"
                        }`}>
                            <p className={`font-medium transition-colors ${
                                isDark ? "text-slate-200" : "text-slate-700"
                            }`}>{meal.name}</p>
                            <span className={`font-medium transition-colors ${
                                isDark ? "text-slate-300" : "text-slate-600"
                            }`}>{meal.totalCalories} kcal</span>
                        </li>
                    ))}
                    {plan.meals.length > 4 && (
                        <li className={`text-xs text-center pt-1 transition-colors ${
                            isDark ? "text-slate-500" : "text-slate-400"
                        }`}>
                            + {plan.meals.length - 4} mais refeições
                        </li>
                    )}
                </ul>
            ) : (
                <div className={`flex-grow flex flex-col items-center justify-center text-center p-4 rounded-lg border border-dashed transition-all ${
                    isDark 
                        ? "bg-slate-900/40 border-slate-700 text-slate-400" 
                        : "bg-slate-50 border-gray-200 text-slate-400"
                }`}>
                    <BowlIcon className="w-10 h-10 mb-2" />
                    <p className="font-semibold">Vá para a tela de Dieta para gerar seu plano de hoje!</p>
                </div>
            )}
        </div>
    );
};

export default TodaysDietCard;
