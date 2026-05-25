import React, { useState, useMemo, FC, useEffect } from "react";
import {
  UserData,
  DailyPlan,
  Meal,
  View,
  UserDataHandlers,
  MacroData,
  DietDifficulty,
  FoodItem,
  NotificationState,
} from "../types";
import MealCard from "./MealCard";
import { SparklesIcon } from "./icons/SparklesIcon";
import { ChevronLeftIcon } from "./icons/ChevronLeftIcon";
import { ChevronRightIcon } from "./icons/ChevronRightIcon";
import { CalendarIcon } from "./icons/CalendarIcon";
import { TargetIcon } from "./icons/TargetIcon";
import { FireIcon } from "./icons/FireIcon";
import { BowlIcon } from "./icons/BowlIcon";
import { BellIcon } from "./icons/BellIcon";
import { ChatIcon } from "./icons/ChatIcon";
import { StarIcon } from "./icons/StarIcon";
import { CheckIcon } from "./icons/CheckIcon";
import { UtensilsIcon } from "./icons/UtensilsIcon";
import { ListIcon } from "./icons/ListIcon";
import AdminAccessSection from "./AdminAccessSection";
import { PLANS } from "../constants/plans";
import { ShareIcon } from "./icons/ShareIcon";
import html2canvas from "html2canvas";
import { DietImage } from "./DietImage";
import ShareDietModal from "./ShareDietModal";
import { ChevronUpIcon } from "./icons/ChevronUpIcon";
import { ChevronDownIcon } from "./icons/ChevronDownIcon";
import { MonthlyView } from "./MonthlyView";

interface PlanoAlimentarViewProps {
  userData: UserData;
  handlers: UserDataHandlers;
  lastMealPlanText: string | null;
  mealPlan: Record<string, DailyPlan> | null;
  setMealPlan: React.Dispatch<React.SetStateAction<Record<string, DailyPlan>>>;
  favoritePlans: DailyPlan[];
  onToggleFavorite: (plan: DailyPlan) => void;
  setActiveView: (view: View) => void;
  showNotification: (notification: NotificationState) => void;
  isPlanProcessing: boolean;
}

const formatDate = (date: Date, options: Intl.DateTimeFormatOptions) => {
  return new Intl.DateTimeFormat("pt-BR", options).format(date);
};

const getStartOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const isSameDay = (d1: Date, d2: Date) => {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

const LoadingSpinner: FC<{ className?: string }> = ({ className }) => (
  <svg
    className={`animate-spin ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

const getRemainingUses = (userData: UserData, featureKey: string) => {
  const isTrial =
    !userData.isSubscribed && new Date(userData.trialEndDate) > new Date();
  const planKey = isTrial
    ? "pro"
    : userData.isSubscribed && userData.currentPlan
      ? userData.currentPlan
      : "basic";
  const plan = PLANS[planKey];
  if (!plan) return { remaining: 0, limit: 0, period: "day" }; // FIX: Return default if plan is undefined
  const feature = plan.features.find((f: any) => f.key === featureKey);

  if (!feature || !feature.limit || feature.limit === Infinity) {
    return { remaining: Infinity, limit: Infinity, period: "day" };
  }

  const usageData =
    feature.period === "week" ? userData.weeklyUsage : userData.dailyUsage;
  const currentUsage = (usageData as any)[featureKey] || 0;
  const purchasedUsage = userData.purchasedUses?.[featureKey] || 0;

  return {
    remaining: feature.limit - currentUsage + purchasedUsage,
    limit: feature.limit,
    period: feature.period === "week" ? "semana" : "dia",
  };
};

const PlanComplianceCard: FC<{
  label: string;
  macroKey: keyof Omit<MacroData, "calories">;
  planned: number;
  goal: number;
  unit: string;
  color: string;
  onAdjust: (macro: keyof Omit<MacroData, "calories">) => void;
  isAdjusting: boolean;
  userData: UserData;
}> = ({
  label,
  macroKey,
  planned,
  goal,
  unit,
  color,
  onAdjust,
  isAdjusting,
  userData,
}) => {
  const compliance = goal > 0 ? planned / goal : 0;

  let statusText: string;
  let statusColor: string;
  let showAdjustButton = false;

  if (compliance >= 0.98 && compliance <= 1.02) {
    statusText = "Perfeito";
    statusColor = "text-green-600";
  } else if (compliance >= 0.85 && compliance <= 1.15) {
    statusText = "Muito boa";
    statusColor = "text-yellow-600";
  } else {
    statusText = "Precisa melhorar";
    statusColor = "text-orange-600";
    showAdjustButton = true;
  }

  const uses = getRemainingUses(userData, "macroAdjustments");

  return (
    <div
      className={`bg-slate-50 p-2.5 rounded-lg border border-slate-200 transition-all flex flex-col justify-between ${isAdjusting ? "opacity-50" : ""}`}
    >
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="font-semibold text-slate-700 text-xs">{label}</span>
          <span className={`text-xs font-bold ${statusColor}`}>
            {statusText}
          </span>
        </div>
        <div className="text-lg font-bold text-slate-800 mb-1.5">
          {Math.round(planned)}
          {unit}
          <span className="text-xs font-normal text-slate-500 ml-1.5">
            / {goal}
            {unit}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div
            className={`${color} h-1.5 rounded-full`}
            style={{ width: `${Math.min(compliance * 100, 100)}%` }}
          ></div>
        </div>
      </div>
      {showAdjustButton && (
        <button
          onClick={() => onAdjust(macroKey)}
          disabled={isAdjusting}
          className="mt-2 w-full text-xs font-bold py-1 px-2 bg-slate-800 text-white rounded-md hover:bg-slate-900 transition-colors disabled:bg-slate-400 flex items-center justify-center gap-1"
        >
          {isAdjusting ? (
            <>
              <LoadingSpinner className="w-3 h-3" /> Ajustando...
            </>
          ) : (
            <>
              <SparklesIcon className="w-3 h-3" /> Ajustar
            </>
          )}
          {uses.limit !== Infinity && (
            <span className="text-xs font-normal text-white/70">
              ({uses.remaining}/{uses.limit})
            </span>
          )}
        </button>
      )}
    </div>
  );
};

const DayCard: FC<{
  dailyPlan: DailyPlan | undefined;
  onSelect: () => void;
}> = ({ dailyPlan, onSelect }) => {
  const today = new Date();

  if (!dailyPlan || !Array.isArray(dailyPlan.meals)) {
    return (
      <div className="bg-slate-50 p-3 rounded-xl border border-dashed border-gray-300 flex flex-col justify-center items-center h-full opacity-70">
        <p className="text-slate-400 text-center text-sm font-medium">
          Sem plano
        </p>
      </div>
    );
  }

  const isToday = isSameDay(new Date(dailyPlan.date + "T00:00:00.000Z"), today);
  const { date, dayOfWeek, meals, totalCalories, waterGoal } = dailyPlan;
  const dateObj = new Date(date + "T00:00:00.000Z");

  return (
    <div
      onClick={onSelect}
      className={`bg-white p-3 rounded-xl shadow-sm border ${isToday ? "border-brand-green shadow-md" : "border-gray-100"} flex flex-col justify-between h-full cursor-pointer hover:shadow-md hover:border-gray-300 transition-all`}
    >
      <div>
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="font-bold text-sm text-slate-800">{dayOfWeek}</p>
            <p className="text-xs text-slate-500">
              {formatDate(dateObj, { day: "numeric", month: "short" })}
            </p>
          </div>
          {isToday && (
            <span className="text-xs font-bold bg-brand-green-light text-brand-green-dark px-2 py-0.5 rounded-full">
              Hoje
            </span>
          )}
        </div>

        <ul className="space-y-1 text-xs text-slate-500 mt-2">
          {meals.slice(0, 3).map((meal) => (
            <li
              key={meal.id}
              className="flex justify-between items-center gap-2"
            >
              <span className="truncate" title={meal.name}>
                {meal.name}
              </span>
              <span className="font-medium text-slate-500 whitespace-nowrap">
                {meal.totalCalories}
              </span>
            </li>
          ))}
          {meals.length > 3 && (
            <li className="text-slate-500 text-xs font-medium pt-0.5">
              + {meals.length - 3} mais
            </li>
          )}
        </ul>
      </div>

      <div className="mt-3 border-t border-gray-100 pt-2">
        <div className="flex justify-between items-center">
          <div className="text-center flex-1">
            <p className="font-bold text-brand-orange text-sm">
              {totalCalories.toLocaleString("pt-BR")}
            </p>
            <p className="text-xs text-slate-500">kcal</p>
          </div>
          <div className="border-l h-6 border-gray-200 mx-1"></div>
          <div className="text-center flex-1">
            <p className="font-bold text-brand-blue text-sm">{waterGoal}L</p>
            <p className="text-xs text-slate-500">água</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const DIET_TAGS = [
  "Pouca Variedade",
  "Muita Variedade",
  "Mais Econômica",
  "Ingredientes Premium",
  "Preparo Rápido",
  "Foco em Saciedade",
  "Refeição Livre (FDS)",
  "Incluir Suplementos",
  "Dieta Low Carb",
  "Cetogênica 🥑",
  "Hipertrofia 💪",
  "Definição Muscular ⚡",
  "Emagrecimento Rápido 🔥",
  "Vegetariano 🌱",
  "Vegano 🌿",
  "Sem Lactose 🥛",
  "Sem Glúten 🌾",
  "Marmitas Congeladas 🥡",
  "Anti-inflamatória 🧪",
  "Ingredientes Simples/Despensa",
  "Zero Açúcar 🍬",
  "Foco em Fibras 🍏"
];

const WeeklyView: FC<{
  week: (DailyPlan | undefined)[];
  onSelectDay: (date: Date) => void;
  onNavigate: (direction: "prev" | "next") => void;
  weekDate: Date;
  onGenerateWeek: (startDate: Date, observation?: string) => void;
  isProcessing: boolean;
  userData: UserData;
  handlers: UserDataHandlers;
  onSelectWeekDate?: (date: Date) => void;
  mealPlan?: Record<string, DailyPlan> | null;
}> = ({
  week,
  onSelectDay,
  onNavigate,
  weekDate,
  onGenerateWeek,
  isProcessing,
  userData,
  handlers,
  onSelectWeekDate,
  mealPlan,
}) => {
  const [observation, setObservation] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTagsExpanded, setIsTagsExpanded] = useState(false);
  const [mealCount, setMealCount] = useState<string>("5");
  
  // Year and Month navigation state for full calendar
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  const [calendarYear, setCalendarYear] = useState<number>(weekDate.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(weekDate.getMonth());

  const firstFiveTags = DIET_TAGS.slice(0, 5);
  const remainingTags = DIET_TAGS.slice(5);

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleGenerateClick = () => {
    let finalObservation = "";
    if (mealCount !== "automatico") {
      finalObservation += `Gere o cardápio com exatamente ${mealCount} refeições diárias completas. `;
    }
    if (selectedTags.length > 0) {
      finalObservation += `Tags: ${selectedTags.join(", ")}. `;
    }
    if (observation.trim()) {
      finalObservation += `Observações adicionais: ${observation.trim()}`;
    }
    onGenerateWeek(weekDate, finalObservation.trim());
  };

  const portugueseMonths = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // Upcoming 6 weeks calculation
  const upcomingWeeks = useMemo(() => {
    const list = [];
    const baseDate = getStartOfWeek(new Date());
    for (let i = 0; i < 6; i++) {
      const start = new Date(baseDate);
      start.setDate(start.getDate() + i * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      
      const isSelected = start.toDateString() === getStartOfWeek(weekDate).toDateString();
      
      list.push({
        start,
        end,
        isSelected,
        label: i === 0 ? "Semana Atual" : `Semana +${i}`,
        rangeText: `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}`
      });
    }
    return list;
  }, [weekDate]);

  // Calendar calculations
  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1);
  const lastDayOfMonth = new Date(calendarYear, calendarMonth + 1, 0);
  
  // day of week for index start (standard JS 0=Sun, 1=Mon... we shift to make Mon=0)
  const shiftDayOfWeek = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;
  const daysCount = lastDayOfMonth.getDate();

  const calendarDays = useMemo(() => {
    const arr = [];
    for (let i = 0; i < shiftDayOfWeek; i++) {
      arr.push(null);
    }
    for (let d = 1; d <= daysCount; d++) {
      arr.push(new Date(calendarYear, calendarMonth, d));
    }
    return arr;
  }, [calendarYear, calendarMonth, shiftDayOfWeek, daysCount]);

  const handleMonthChange = (direction: number) => {
    let newMonth = calendarMonth + direction;
    let newYear = calendarYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    setCalendarMonth(newMonth);
    setCalendarYear(newYear);
  };

  return (
    <div>
      {/* Upcoming Weeks Navigation Timeline */}
      <div className="mb-6 bg-white p-5 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <CalendarIcon className="w-4.5 h-4.5 text-brand-green" />
                Navegar pelas Próximas Semanas
              </h4>
              <span className="bg-brand-green/15 text-brand-green-dark text-[9px] font-extrabold px-2 py-0.5 rounded-full animate-pulse uppercase tracking-wider">
                Novo
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Selecione uma semana futura para carregar ou planejar seu cardápio com antecedência.</p>
          </div>
          <span className="text-[10px] text-slate-400 font-mono bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100 self-start sm:self-auto">Próximos 45 dias</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
          {upcomingWeeks.map((wk, idx) => (
            <button
              key={idx}
              disabled={isProcessing}
              onClick={() => onSelectWeekDate && onSelectWeekDate(wk.start)}
              className={`flex-none py-2.5 px-4 rounded-xl border text-left transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                wk.isSelected
                  ? "bg-gradient-to-br from-brand-green to-brand-green-dark border-brand-green text-white shadow-md shadow-brand-green/10 ring-2 ring-brand-green/20"
                  : "bg-slate-50 hover:bg-white border-slate-150 text-slate-700 hover:border-brand-green/55 hover:shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] uppercase tracking-widest font-bold opacity-85">
                  {wk.label}
                </span>
                {wk.isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                )}
              </div>
              <div className="text-xs font-bold font-mono mt-1 flex items-center gap-1">
                <span>{wk.rangeText}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">
            Semana de {formatDate(weekDate, { day: "numeric", month: "long" })}
            <span className="text-slate-400 font-normal">
              , {weekDate.getFullYear()}
            </span>
          </h3>
          <p className="text-xs text-slate-400">Arraste para o lado ou clique em Ver Mês e Ano</p>
        </div>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
            className={`py-2 px-3.5 rounded-lg font-bold text-xs flex items-center gap-1.5 border transition-all ${
              isCalendarExpanded
                ? "bg-brand-green/10 text-brand-green-dark border-brand-green/35"
                : "bg-white text-slate-700 hover:text-brand-green hover:border-brand-green border-slate-200"
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>📅 Ver Mês / Ano Inteiro</span>
          </button>
          
          <button
            onClick={() =>
              handlers.generateShoppingList(
                week.filter((p): p is DailyPlan => !!p),
              )
            }
            disabled={isProcessing || week.every((d) => !d)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:bg-slate-400"
          >
            <ListIcon className="w-4 h-4" />
            <span>Lista de Compras</span>
            {(() => {
              const uses = getRemainingUses(userData, "shoppingLists");
              if (uses.limit === Infinity) return null;
              return (
                <span className="text-[10px] font-normal text-white/70">
                  ({uses.remaining})
                </span>
              );
            })()}
          </button>
          
          <button
            onClick={() => onNavigate("prev")}
            disabled={isProcessing}
            className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigate("next")}
            disabled={isProcessing}
            className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Embedded Month & Year Calendar Explorer */}
      {isCalendarExpanded && (
        <div className="mb-6 bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-5 animate-fadeIn">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">
                🔍 Calendário Inteligente de Refeições
              </h4>
              <p className="text-xs text-slate-400">Toque em qualquer dia para abrir ou planejar sua dieta para esse dia</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleMonthChange(-1)}
                className="p-1 px-2 text-xs bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-md"
              >
                Mês Anterior
              </button>
              <span className="text-xs uppercase font-extrabold text-brand-green-dark bg-brand-green-light px-2.5 py-1 rounded">
                {portugueseMonths[calendarMonth]} {calendarYear}
              </span>
              <button
                onClick={() => handleMonthChange(1)}
                className="p-1 px-2 text-xs bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-md"
              >
                Próximo Mês
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Year Selector / Navigation Rail */}
            <div className="md:border-r border-slate-100 pr-0 md:pr-4 space-y-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Visão Anual completa</div>
              <div className="flex flex-wrap md:grid md:grid-cols-2 gap-1.5">
                {portugueseMonths.map((mth, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCalendarMonth(idx)}
                    className={`px-2 py-1.5 text-xs text-left font-semibold rounded transition-all ${
                      calendarMonth === idx
                        ? "bg-brand-green-dark text-white font-bold"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-600"
                    }`}
                  >
                    {mth.slice(0, 3)}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-2 justify-center">
                {[-1, 0, 1].map((offset) => {
                  const yr = new Date().getFullYear() + offset;
                  return (
                    <button
                      key={yr}
                      onClick={() => setCalendarYear(yr)}
                      className={`px-2 py-1 text-xs rounded border transition-all ${
                        calendarYear === yr
                          ? "border-brand-green bg-brand-green/5 font-bold text-brand-green-dark"
                          : "border-slate-200 text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {yr}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Monthly Calendar View */}
            <div className="md:col-span-3 space-y-2">
              {/* Days of week header */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid of days */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((dateVal, cellIdx) => {
                  if (!dateVal) {
                    return <div key={`empty-${cellIdx}`} className="bg-slate-50/20 rounded-lg aspect-square" />;
                  }

                  const dayStr = dateVal.toISOString().split("T")[0];
                  // Plan presence detection
                  const hasPlan = mealPlan && !!mealPlan[dayStr];
                  const isDaySelected = weekDate.toISOString().split("T")[0] === dayStr || 
                                       (week.some(d => d && d.date === dayStr));
                  const isCurrentToday = new Date().toDateString() === dateVal.toDateString();

                  return (
                    <button
                      key={dayStr}
                      disabled={isProcessing}
                      onClick={() => {
                        // Click setting of currentDate
                        if (onSelectWeekDate) {
                          onSelectWeekDate(dateVal);
                        }
                      }}
                      className={`aspect-square p-1 rounded-lg flex flex-col items-center justify-between border transition-all ${
                        isDaySelected
                          ? "bg-brand-green/10 border-brand-green/45 ring-1 ring-brand-green/20"
                          : isCurrentToday
                          ? "border-blue-500 bg-blue-50/30 text-blue-600"
                          : "border-slate-100 bg-white hover:border-slate-350 text-slate-700"
                      }`}
                    >
                      <span className={`text-[11px] font-bold ${isCurrentToday ? "text-blue-600" : ""}`}>
                        {dateVal.getDate()}
                      </span>
                      {hasPlan ? (
                        <span className="w-2 h-2 rounded-full bg-brand-green shadow-xs block animate-pulse" title="Dieta Gerada" />
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-200 block" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 bg-brand-green-light/50 p-5 rounded-xl border-2 border-dashed border-brand-green/30 theme-athlete:bg-zinc-800 theme-athlete:border-zinc-700">
        <h4 className="font-bold text-lg text-brand-green-dark theme-athlete:text-white flex items-center gap-2 mb-3">
          <SparklesIcon className="w-5 h-5" />
          Personalize sua Dieta Semanal com IA
        </h4>
        <div className="space-y-4">
          {/* Custom Meal Count Drodown Option */}
          <div className="bg-white/80 p-3 rounded-xl border border-slate-100">
            <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-2">
              🍽️ Quantas refeições deseja por dia?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {["3", "4", "5", "6", "automatico"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setMealCount(opt)}
                  disabled={isProcessing}
                  className={`py-2 px-3.5 text-xs font-bold rounded-lg border transition-all ${
                    mealCount === opt
                      ? "bg-brand-green border-brand-green text-white shadow-sm font-semibold"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:border-brand-green hover:bg-white"
                  }`}
                >
                  {opt === "automatico" ? "Deixar IA decidir" : `${opt} refeiçoes`}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Adicionar tags para a IA (opcional)
                {selectedTags.length > 0 && (
                  <span className="ml-2 bg-brand-green text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {selectedTags.length} selecionada(s)
                  </span>
                )}
              </label>
              <button
                onClick={() => setIsTagsExpanded(!isTagsExpanded)}
                className="p-1 rounded-full hover:bg-brand-green/10"
                aria-expanded={isTagsExpanded}
                aria-controls="diet-tags-container"
              >
                {isTagsExpanded ? (
                  <ChevronUpIcon className="w-5 h-5 text-brand-green-dark" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5 text-brand-green-dark" />
                )}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {firstFiveTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  disabled={isProcessing}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-full border-2 transition-colors disabled:opacity-50 ${
                    selectedTags.includes(tag)
                      ? "bg-brand-green text-white border-brand-green"
                      : "bg-white text-slate-600 border-slate-300 hover:border-brand-green hover:text-brand-green"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <div
              id="diet-tags-container"
              className={`tags-container ${isTagsExpanded ? "" : "collapsed"}`}
            >
              <div className="flex flex-wrap gap-2 pt-2">
                {remainingTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    disabled={isProcessing}
                    className={`px-3 py-1.5 text-sm font-semibold rounded-full border-2 transition-colors disabled:opacity-50 ${
                      selectedTags.includes(tag)
                        ? "bg-brand-green text-white border-brand-green"
                        : "bg-white text-slate-600 border-slate-300 hover:border-brand-green hover:text-brand-green"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="observation-input"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Outras instruções para a IA (opcional)
            </label>
            <textarea
              id="observation-input"
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Ex: Não gosto de peixe, prefiro carne vermelha magra."
              rows={2}
              className="w-full px-3 py-2 bg-white text-slate-800 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-green theme-athlete:bg-zinc-700 theme-athlete:border-zinc-600 theme-athlete:text-white theme-athlete:placeholder:text-zinc-400"
              disabled={isProcessing}
            />
          </div>
          <button
            onClick={handleGenerateClick}
            disabled={isProcessing}
            className="w-full bg-brand-green hover:bg-brand-green-dark text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-md text-base disabled:bg-slate-400"
          >
            {isProcessing ? (
              <LoadingSpinner className="w-5 h-5" />
            ) : (
              <span>Gerar Dieta</span>
            )}
            {(() => {
              if (isProcessing) return null;
              const uses = getRemainingUses(userData, "weeklyPlanGenerations");
              if (uses.limit === Infinity) return null;
              return (
                <span className="text-xs font-normal bg-black/20 px-2 py-0.5 rounded-full">
                  ({uses.remaining} restantes)
                </span>
              );
            })()}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {week.map((day, index) => (
          <DayCard
            key={day ? day.date : index}
            dailyPlan={day}
            onSelect={() => onSelectDay(addDays(weekDate, index))}
          />
        ))}
      </div>
    </div>
  );
};

interface DailyViewProps {
  dailyPlan: DailyPlan;
  onBackToWeeklyView: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  userData: UserData;
  handlers: UserDataHandlers;
  isProcessing: boolean;
  showNotification: (notification: NotificationState) => void;
  onAdjustDayForMacro: (
    macro: keyof Omit<MacroData, "calories">,
  ) => Promise<void>;
}

const DailyView: FC<DailyViewProps> = (props) => {
  const {
    dailyPlan,
    onBackToWeeklyView,
    isFavorite,
    onToggleFavorite,
    userData,
    handlers,
    isProcessing,
    showNotification,
    onAdjustDayForMacro,
  } = props;

  const handleRegenerateMeal = async (mealId: string, prompt: string) => {
    await handlers.regenerateMeal(dailyPlan.date, mealId, prompt);
  };

  const handleSwapItem = async (mealId: string, itemToSwap: FoodItem) => {
    await handlers.handleSwapItem(dailyPlan.date, mealId, itemToSwap);
  };

  const handleTimeUpdate = (mealId: string, newTime: string) => {
    const mealToUpdate = dailyPlan.meals.find((m) => m.id === mealId);
    if (mealToUpdate) {
      handlers.updateMeal(dailyPlan.date, { ...mealToUpdate, time: newTime });
    }
  };

  const handleUpdateMealCount = (count: number) => {
    handlers.regenerateDay(dailyPlan.date, count);
  };

  const handleRegenerateDay = () => {
    handlers.regenerateDay(dailyPlan.date);
  };

  const handleToggleMealReminders = async () => {
    if (Notification.permission === "denied") {
      alert(
        "As notificações foram bloqueadas. Para ativá-las, mude as permissões do site no seu navegador.",
      );
      return;
    }

    if (Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Você precisa permitir notificações para usar este recurso.");
        return;
      }
    }

    handlers.updateUserData({
      mealReminders: { enabled: !userData.mealReminders.enabled },
    });
    showNotification({
      type: "info",
      message: `Lembretes de refeição ${!userData.mealReminders.enabled ? "ativados" : "desativados"}.`,
    });
    setTimeout(() => showNotification(null), 2000);
  };

  const isToday = useMemo(
    () => isSameDay(new Date(dailyPlan.date + "T12:00:00"), new Date()),
    [dailyPlan.date],
  );
  const isTodayCompleted = useMemo(
    () => userData.completedDays.includes(dailyPlan.date),
    [userData.completedDays, dailyPlan.date],
  );

  const isDark = userData.darkMode || userData.dietDifficulty === "athlete";

  return (
    <div className="max-w-4xl mx-auto">
      {/* Unified beautiful daily plan header structure */}
      <div className={`backdrop-blur-md p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 border ${
        isDark 
          ? "bg-slate-800/85 border-slate-700/60" 
          : "bg-white/85 border-gray-100"
      }`}>
        <div>
          {/* Row containing Date & Favorite button */}
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className={`text-xl font-extrabold capitalize leading-tight ${isDark ? "text-slate-100" : "text-slate-800"}`}>
              {formatDate(new Date(dailyPlan.date + "T00:00:00.000Z"), {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h3>

            {/* Integrated pill-shaped Favorite button */}
            <button
              onClick={onToggleFavorite}
              className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all duration-200 border cursor-pointer ${
                isFavorite
                  ? isDark
                    ? "bg-amber-950/40 border-amber-850 text-amber-300 hover:bg-amber-900/40"
                    : "bg-amber-50 border-amber-200 text-amber-700 shadow-sm shadow-amber-100/50 hover:bg-amber-100"
                  : isDark
                    ? "bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-650"
                    : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:border-slate-300"
              }`}
            >
              <StarIcon
                className={`w-3.5 h-3.5 ${isFavorite ? "text-amber-500 fill-current" : "text-slate-400"}`}
              />
              {isFavorite ? "Favoritado" : "Favoritar"}
            </button>
          </div>
          <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Seu cardápio nutricional para o dia
          </p>
        </div>

        {/* Action Buttons Group */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Back to Weekly calendar button */}
          <button
            onClick={onBackToWeeklyView}
            className={`px-3.5 py-2 border rounded-xl flex items-center gap-2 text-sm font-bold transition-colors shadow-sm cursor-pointer ${
              isDark
                ? "bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-650"
                : "bg-white border-gray-200 text-slate-700 hover:bg-gray-50"
            }`}
          >
            <CalendarIcon className="w-4 h-4 text-slate-400" />
            <span>Alterar Data</span>
          </button>

          {/* Daily Goal Completion Button */}
          {isToday && (
            <button
              onClick={handlers.handleMarkDayAsCompleted}
              disabled={isTodayCompleted}
              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-extrabold rounded-xl flex items-center gap-2 text-sm transition-all shadow-sm shadow-teal-100 disabled:from-slate-400 disabled:to-slate-400 disabled:shadow-none disabled:cursor-not-allowed cursor-pointer"
            >
              {isTodayCompleted ? (
                <CheckIcon className="w-4 h-4" />
              ) : (
                <FireIcon className="w-4 h-4" />
              )}
              {isTodayCompleted ? "Meta Concluída!" : "Bati a Meta"}
            </button>
          )}

          {/* Notification reminders button */}
          <button
            onClick={handleToggleMealReminders}
            className={`p-2 border rounded-xl transition-all flex items-center justify-center shadow-sm cursor-pointer ${
              userData.mealReminders.enabled
                ? isDark
                  ? "border-yellow-700 text-yellow-400 bg-yellow-950/40"
                  : "border-yellow-200 text-yellow-600 bg-yellow-50/50"
                : isDark
                  ? "border-slate-600 text-slate-300 bg-slate-700 hover:bg-slate-650"
                  : "border-gray-200 text-slate-600 bg-white hover:bg-gray-50"
            }`}
            title={
              userData.mealReminders.enabled
                ? "Desativar lembretes"
                : "Ativar lembretes de refeição"
            }
          >
            <BellIcon
              className={`w-5 h-5 transition-transform duration-200 ${userData.mealReminders.enabled ? "fill-yellow-400 text-yellow-500 scale-105" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Secondary Row: Meal count selector */}
      <div className={`flex justify-between items-center mb-5 p-4 rounded-xl border shadow-sm ${
        isDark 
          ? "bg-slate-800/85 border-slate-700/60" 
          : "bg-white border-gray-100"
      }`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={(dailyPlan.meals || []).length}
              onChange={(e) => handleUpdateMealCount(Number(e.target.value))}
              disabled={isProcessing}
              className={`pl-3 pr-8 py-2 border rounded-xl text-sm font-bold appearance-none disabled:bg-opacity-50 shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-green ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750"
                  : "bg-white border-gray-200 text-slate-700 hover:bg-gray-50"
              }`}
              aria-label="Selecionar número de refeições"
            >
              <option value="3">3 Refeições</option>
              <option value="4">4 Refeições</option>
              <option value="5">5 Refeições</option>
              <option value="6">6 Refeições</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
              <svg
                className="fill-current h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
          {(() => {
            const uses = getRemainingUses(userData, "dayRegenerations");
            if (uses.limit === Infinity) return null;
            return (
              <div className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                isDark
                  ? "bg-slate-700 text-slate-300"
                  : "bg-slate-100 text-slate-600"
              }`}>
                {uses.remaining}/{uses.limit}
              </div>
            );
          })()}
        </div>
      </div>

      <div className="space-y-4">
        {(dailyPlan.meals || []).map(
          (meal) =>
            meal && (
              <MealCard
                key={meal.id}
                meal={meal}
                onRegenerate={handleRegenerateMeal}
                onSwapItem={handleSwapItem}
                onTimeUpdate={handleTimeUpdate}
                showNotification={showNotification}
                handlers={handlers}
                userData={userData}
              />
            ),
        )}
      </div>
    </div>
  );
};

// FIX: Export DietModeSelector for use in Dashboard.tsx
export const DietModeSelector: React.FC<{
  currentDifficulty: DietDifficulty;
  onChange: (difficulty: DietDifficulty) => void;
  isSubscribed: boolean;
  openSubscriptionModal: () => void;
  isDark?: boolean;
}> = ({ currentDifficulty, onChange, isSubscribed, openSubscriptionModal, isDark }) => {
  const options: { label: string; value: DietDifficulty }[] = [
    { label: "Fácil", value: "easy" },
    { label: "Normal", value: "normal" },
    { label: "Atleta 🔥", value: "athlete" },
  ];

  const handleChange = (difficulty: DietDifficulty) => {
    if (difficulty === "athlete" && !isSubscribed) {
      openSubscriptionModal();
      return;
    }
    onChange(difficulty);
  };

  let iconGradient = "from-blue-500 to-indigo-500 shadow-blue-500/20";
  if (currentDifficulty === "easy") {
    iconGradient = "from-emerald-500 to-teal-500 shadow-emerald-500/20";
  } else if (currentDifficulty === "athlete") {
    iconGradient = "from-orange-500 to-rose-500 shadow-orange-500/20";
  }

  return (
    <div className={`p-4 rounded-xl shadow-sm border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors duration-300 ${
      isDark
        ? "bg-slate-800 border-slate-700 text-slate-100"
        : "bg-gradient-to-r from-orange-50/60 via-white/80 to-amber-50/40 border-orange-100 text-slate-800"
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${iconGradient} shadow-md text-white transition-all duration-300`}>
          <UtensilsIcon className="w-5 h-5 text-white" style={{ stroke: '#ffffff' }} />
        </div>
        <div>
          <h3 className={`font-extrabold ${isDark ? "text-slate-100" : "text-slate-800"}`}>Modo da Dieta</h3>
          <p className={`text-xs font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            Ajusta a intensidade e o cálculo de macros.
          </p>
        </div>
      </div>
      <div className="flex-shrink-0 w-full sm:w-auto">
        <div className={`flex p-1.5 rounded-xl border ${
          isDark
            ? "bg-slate-900/40 border-slate-705"
            : "bg-slate-100/80 border-slate-200/50"
        }`}>
          {options.map((option) => {
            const isSelected = currentDifficulty === option.value;
            let activeBg = "bg-white text-brand-green shadow-sm";
            if (isSelected) {
              if (option.value === "easy") {
                activeBg = "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/10";
              } else if (option.value === "normal") {
                activeBg = "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md shadow-blue-500/10";
              } else if (option.value === "athlete") {
                activeBg = "bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md shadow-orange-500/10";
              }
            }
            
            return (
              <button
                key={option.value}
                onClick={() => handleChange(option.value)}
                className={`flex-1 text-center px-4 py-2 text-xs font-extrabold rounded-lg transition-all duration-300 min-w-[85px] cursor-pointer
                                  ${
                                    isSelected
                                      ? `${activeBg}`
                                      : isDark
                                        ? "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                                        : "text-slate-500 hover:bg-slate-200/55 hover:text-slate-700"
                                  }
                              `}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const PlanoAlimentarView: React.FC<PlanoAlimentarViewProps> = ({
  userData,
  handlers,
  lastMealPlanText,
  mealPlan,
  setMealPlan,
  favoritePlans,
  onToggleFavorite,
  setActiveView,
  showNotification,
  isPlanProcessing,
}) => {
  const [view, setView] = useState<"semanal" | "diaria" | "mensal">("diaria");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [processingMacro, setProcessingMacro] = useState<
    keyof Omit<MacroData, "calories"> | null
  >(null);
  const [imageRenderPlan, setImageRenderPlan] = useState<DailyPlan | null>(
    null,
  );
  const [shareModalState, setShareModalState] = useState<{
    isOpen: boolean;
    imageDataUrl: string;
    plan: DailyPlan | null;
  }>({ isOpen: false, imageDataUrl: "", plan: null });

  const theme = userData.dietDifficulty === "athlete" ? "athlete" : "light";

  useEffect(() => {
    const dateKey = currentDate.toISOString().split("T")[0];
    if (mealPlan && !mealPlan[dateKey] && view === "diaria") {
      const mostRecentDate = Object.keys(mealPlan).sort().pop();
      if (mostRecentDate) {
        setCurrentDate(new Date(mostRecentDate + "T12:00:00"));
      }
    }
  }, [mealPlan]);

  const startOfWeek = useMemo(() => getStartOfWeek(currentDate), [currentDate]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(startOfWeek, i));
  }, [startOfWeek]);

  const weeklyData = useMemo(() => {
    if (!mealPlan) return Array(7).fill(undefined);
    return weekDays.map((day) => mealPlan[day.toISOString().split("T")[0]]);
  }, [mealPlan, weekDays]);

  const dailyData = useMemo(() => {
    if (!mealPlan) return null;
    return mealPlan[currentDate.toISOString().split("T")[0]];
  }, [mealPlan, currentDate]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !dailyData
    )
      return;
    if (
      !userData.mealReminders.enabled ||
      Notification.permission !== "granted"
    )
      return;

    const scheduledTimers = (dailyData.meals || [])
      .map((meal) => {
        if (!meal || !meal.time) return null;
        const [hour, minute] = meal.time.split(":").map(Number);
        const now = new Date();
        const reminderDate = new Date(now);
        reminderDate.setHours(hour, minute, 0, 0);

        if (reminderDate > now) {
          const timeout = reminderDate.getTime() - now.getTime();
          return setTimeout(() => {
            new Notification(`Hora do seu ${meal.name}! 🍽️`, {
              body: `Está na hora de comer: ${meal.items.map((i) => i.name).join(", ")}.`,
              icon: "/favicon.svg",
            });
          }, timeout);
        }
        return null;
      })
      .filter(Boolean) as ReturnType<typeof setTimeout>[];

    return () => {
      scheduledTimers.forEach(clearTimeout);
    };
  }, [dailyData, userData.mealReminders.enabled]);

  const handleSelectDay = (date: Date) => {
    setCurrentDate(date);
    setView("diaria");
  };

  const handleNavigateWeek = (direction: "prev" | "next") => {
    setCurrentDate((prevDate) => {
      const newDate = new Date(prevDate);
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
      return newDate;
    });
  };

  const handleAdjustDay = async (
    macroToFix: keyof Omit<MacroData, "calories">,
  ) => {
    if (!dailyData) return;
    setProcessingMacro(macroToFix);
    await handlers.adjustDayForMacro(dailyData.date, macroToFix);
    setProcessingMacro(null);
  };

  useEffect(() => {
    if (imageRenderPlan) {
      // Timeout to allow React to render the component off-screen
      setTimeout(() => {
        const sourceElement = document.getElementById(
          "diet-image-render-source",
        );
        if (sourceElement) {
          html2canvas(sourceElement, {
            useCORS: true,
            scale: 2, // For better resolution
          })
            .then((canvas) => {
              const dataUrl = canvas.toDataURL("image/png");
              setShareModalState({
                isOpen: true,
                imageDataUrl: dataUrl,
                plan: imageRenderPlan,
              });
              setImageRenderPlan(null); // Cleanup
              showNotification(null);
            })
            .catch((err) => {
              console.error("html2canvas error:", err);
              showNotification({
                type: "error",
                message: "Erro ao gerar a imagem.",
              });
              setTimeout(() => showNotification(null), 3000);
              setImageRenderPlan(null);
            });
        }
      }, 100);
    }
  }, [imageRenderPlan, showNotification]);

  const handleExportDiet = (plan: DailyPlan) => {
    showNotification({
      type: "loading",
      message: "Gerando imagem da dieta...",
    });
    setImageRenderPlan(plan);
  };

  const tabButtonClasses = (tabName: "semanal" | "diaria" | "mensal") =>
    `px-6 py-2 rounded-lg font-semibold transition-colors text-sm w-full
     ${
       view === tabName
         ? "bg-brand-green text-white shadow"
         : "bg-white text-brand-green-dark"
     }`;

  const importButton = (
    <button
      onClick={() => {
        if (lastMealPlanText) handlers.importPlanFromChat(lastMealPlanText);
      }}
      disabled={!lastMealPlanText || isPlanProcessing}
      className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-colors shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed"
    >
      <ChatIcon className="w-5 h-5" />
      {isPlanProcessing ? "Processando..." : "Importar do Chat"}
    </button>
  );

  if (!mealPlan || !dailyData) {
    return (
      <div className="text-center h-full flex flex-col items-center justify-center">
        <BowlIcon className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          Sua dieta personalizada
        </h2>
        <p className="text-slate-500 max-w-md mb-6">
          Gere uma dieta para a semana inteira com base em suas metas e
          preferências, com o poder da IA.
        </p>
        <div
          id="generate-diet-buttons-container"
          className="flex flex-wrap justify-center gap-4"
        >
          <button
            onClick={() => handlers.generateDailyPlan(new Date())}
            disabled={isPlanProcessing}
            className="bg-brand-green hover:bg-brand-green-dark text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-colors shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            {isPlanProcessing ? (
              <LoadingSpinner className="w-5 h-5" />
            ) : (
              <SparklesIcon className="w-5 h-5" />
            )}
            Gerar Dieta com IA
            {(() => {
              const uses = getRemainingUses(userData, "dailyPlanGenerations");
              if (uses.limit === Infinity) return null;
              return (
                <span className="text-xs font-normal text-white/70">
                  ({uses.remaining}/{uses.limit})
                </span>
              );
            })()}
          </button>
          {importButton}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-2">
              Dieta
            </h2>
            <p className="text-slate-500">
              Seu cardápio personalizado para uma alimentação saudável
            </p>
          </div>
        </header>

        <DietModeSelector
          currentDifficulty={userData.dietDifficulty}
          onChange={handlers.handleChangeDietDifficulty}
          isSubscribed={userData.isSubscribed}
          openSubscriptionModal={handlers.openSubscriptionModal}
          isDark={userData.darkMode || userData.dietDifficulty === "athlete"}
        />

        {view === "diaria" && dailyData && (
          <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <TargetIcon className="w-5 h-5 text-brand-green" />
              <h4 className="font-bold text-slate-800 text-base">
                Análise da Dieta vs. Metas
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex flex-col justify-between">
                <div>
                  <p className="font-semibold text-slate-700 text-xs mb-1">
                    Calorias
                  </p>
                  <div className="text-lg font-bold text-slate-800 mb-1.5">
                    {Math.round(dailyData.totalMacros.calories)}kcal
                    <span className="text-xs font-normal text-slate-500 ml-1.5">
                      / {userData.macros.calories.goal}kcal
                    </span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-brand-orange h-1.5 rounded-full"
                    style={{
                      width: `${Math.min((dailyData.totalMacros.calories / userData.macros.calories.goal) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
              </div>
              <PlanComplianceCard
                label="Proteínas"
                macroKey="protein"
                planned={dailyData.totalMacros.protein}
                goal={userData.macros.protein.goal}
                unit="g"
                color="bg-emerald-500"
                onAdjust={handleAdjustDay}
                isAdjusting={isPlanProcessing && processingMacro === "protein"}
                userData={userData}
              />
              <PlanComplianceCard
                label="Carboidratos"
                macroKey="carbs"
                planned={dailyData.totalMacros.carbs}
                goal={userData.macros.carbs.goal}
                unit="g"
                color="bg-sky-500"
                onAdjust={handleAdjustDay}
                isAdjusting={isPlanProcessing && processingMacro === "carbs"}
                userData={userData}
              />
              <PlanComplianceCard
                label="Gorduras"
                macroKey="fat"
                planned={dailyData.totalMacros.fat}
                goal={userData.macros.fat.goal}
                unit="g"
                color="bg-amber-500"
                onAdjust={handleAdjustDay}
                isAdjusting={isPlanProcessing && processingMacro === "fat"}
                userData={userData}
              />
            </div>
          </div>
        )}

        <main>
          <div className="bg-brand-green-light p-1 rounded-xl flex max-w-md mb-6 gap-1">
            <button
              onClick={() => setView("semanal")}
              className={tabButtonClasses("semanal")}
              aria-selected={view === "semanal"}
            >
              Visão Semanal
            </button>
            <button
              onClick={() => setView("diaria")}
              className={tabButtonClasses("diaria")}
              aria-selected={view === "diaria"}
            >
              Visão Diária
            </button>
            <button
              onClick={() => setView("mensal")}
              className={tabButtonClasses("mensal")}
              aria-selected={view === "mensal"}
              id="tab-view-mensal"
            >
              Mensal 🚀
            </button>
          </div>

          {view !== "mensal" && (
            <div
              id="generate-diet-buttons-container"
              className="flex flex-wrap gap-2 mb-6"
            >
              {view === "diaria" && (
                <>
                  <button
                    onClick={() => {
                      dailyData
                        ? handlers.regenerateDay(dailyData.date)
                        : handlers.generateDailyPlan(currentDate);
                    }}
                    disabled={isPlanProcessing}
                    className="bg-brand-green hover:bg-brand-green-dark text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm disabled:bg-slate-400 disabled:cursor-not-allowed"
                  >
                    {isPlanProcessing ? (
                      <LoadingSpinner className="w-5 h-5" />
                    ) : (
                      <SparklesIcon className="w-5 h-5" />
                    )}
                    {isPlanProcessing ? "Gerando..." : "Regerar Dia"}
                    {(() => {
                      const uses = getRemainingUses(userData, "dayRegenerations");
                      if (uses.limit === Infinity) return null;
                      return (
                        <span className="text-xs font-normal text-white/70">
                          ({uses.remaining}/{uses.limit})
                        </span>
                      );
                    })()}
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  if (lastMealPlanText)
                    handlers.importPlanFromChat(lastMealPlanText);
                }}
                disabled={!lastMealPlanText || isPlanProcessing}
                className="bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-sm disabled:bg-slate-400"
              >
                <ChatIcon className="w-5 h-5" />
                {isPlanProcessing ? "Processando..." : "Importar do Chat"}
                {(() => {
                  const uses = getRemainingUses(userData, "chatImports");
                  if (uses.limit === Infinity) return null;
                  return (
                    <span className="text-xs font-normal text-white/70">
                      ({uses.remaining}/{uses.limit})
                    </span>
                  );
                })()}
              </button>
              {view === "diaria" && dailyData && (
                <button
                  onClick={() => handleExportDiet(dailyData)}
                  disabled={isPlanProcessing || !!imageRenderPlan}
                  className="bg-white border border-gray-300 hover:bg-gray-100 text-slate-700 font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
                >
                  <ShareIcon className="w-5 h-5 text-slate-600" />
                  Exportar Imagem
                </button>
              )}
              <button
                onClick={() => setActiveView("Favoritos")}
                disabled={isPlanProcessing}
                className="bg-white border border-gray-300 hover:bg-gray-100 text-slate-700 font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <StarIcon className="w-5 h-5 text-yellow-500" />
                Ver Favoritos
              </button>
            </div>
          )}

          <div>
            {view === "semanal" && (
              <WeeklyView
                week={weeklyData}
                onSelectDay={handleSelectDay}
                onNavigate={handleNavigateWeek}
                weekDate={startOfWeek}
                onGenerateWeek={handlers.generateWeeklyPlan}
                isProcessing={isPlanProcessing}
                userData={userData}
                handlers={handlers}
                onSelectWeekDate={(date) => setCurrentDate(date)}
                mealPlan={mealPlan}
              />
            )}
            {view === "diaria" && dailyData && (
              <DailyView
                dailyPlan={dailyData}
                onBackToWeeklyView={() => setView("semanal")}
                isFavorite={favoritePlans.some(
                  (p) => p.date === dailyData.date,
                )}
                onToggleFavorite={() => onToggleFavorite(dailyData)}
                userData={userData}
                handlers={handlers}
                isProcessing={isPlanProcessing}
                showNotification={showNotification}
                onAdjustDayForMacro={handleAdjustDay}
              />
            )}
            {view === "diaria" && !dailyData && (
              <div className="text-center p-8 bg-white rounded-lg shadow-sm">
                <p className="text-slate-500">
                  Não há dieta para o dia selecionado.
                </p>
                <p className="text-sm text-slate-400 mt-2">
                  {formatDate(currentDate, { dateStyle: "full" })}
                </p>
              </div>
            )}
            {view === "mensal" && (
              <MonthlyView
                userData={userData}
                handlers={handlers}
                setMealPlan={setMealPlan}
                isProcessing={isPlanProcessing}
                getRemainingUses={getRemainingUses}
                showNotification={showNotification}
                onSelectDay={(date) => {
                  setCurrentDate(date);
                  setView("diaria");
                }}
                mealPlan={mealPlan}
                onPlanCreateSuccess={() => {
                  setView("semanal");
                }}
              />
            )}
          </div>
        </main>

        <AdminAccessSection setActiveView={setActiveView} userData={userData} />
      </div>

      {imageRenderPlan && (
        <div
          id="diet-image-render-source"
          style={{ position: "fixed", left: "-9999px", top: 0, zIndex: -1 }}
        >
          <DietImage plan={imageRenderPlan} user={userData} theme={theme} />
        </div>
      )}

      <ShareDietModal
        isOpen={shareModalState.isOpen}
        onClose={() =>
          setShareModalState({ isOpen: false, imageDataUrl: "", plan: null })
        }
        imageDataUrl={shareModalState.imageDataUrl}
        plan={shareModalState.plan}
      />
    </>
  );
};

export default PlanoAlimentarView;
