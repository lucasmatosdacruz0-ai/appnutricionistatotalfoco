import React, { useState, FC } from "react";
import {
  UserData,
  UserDataHandlers,
  MonthlyDietPlan,
  MonthlyPhase,
  Meal,
  DailyPlan,
} from "../types";
import { SparklesIcon } from "./icons/SparklesIcon";
import { CalendarIcon } from "./icons/CalendarIcon";
import { FireIcon } from "./icons/FireIcon";
import { StarIcon } from "./icons/StarIcon";
import { DownloadIcon } from "./icons/DownloadIcon";
import { UtensilsIcon } from "./icons/UtensilsIcon";
import { ListIcon } from "./icons/ListIcon";
import { CheckIcon } from "./icons/CheckIcon";
import { ChevronDownIcon } from "./icons/ChevronDownIcon";
import { ChevronUpIcon } from "./icons/ChevronUpIcon";
import { TrashIcon } from "./icons/TrashIcon";

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

interface MonthlyViewProps {
  userData: UserData;
  handlers: UserDataHandlers;
  setMealPlan: React.Dispatch<React.SetStateAction<Record<string, DailyPlan>>>;
  isProcessing: boolean;
  getRemainingUses: (
    userData: UserData,
    featureKey: string,
  ) => { remaining: number; limit: number };
  showNotification: (
    notif: {
      type: "success" | "error" | "loading" | "info";
      message: string;
    } | null,
  ) => void;
  onSelectDay?: (date: Date) => void;
  mealPlan?: Record<string, DailyPlan> | null;
  onPlanCreateSuccess?: () => void;
}

export const MonthlyView: FC<MonthlyViewProps> = ({
  userData,
  handlers,
  setMealPlan,
  isProcessing,
  getRemainingUses,
  showNotification,
  onSelectDay,
  mealPlan,
  onPlanCreateSuccess,
}) => {
  const [observation, setObservation] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isTagsExpanded, setIsTagsExpanded] = useState(false);
  const [selectedPhaseNum, setSelectedPhaseNum] = useState<number>(1);
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});
  const [mealCount, setMealCount] = useState<string>("5");

  // Embedded Calendar States
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  const [calendarYear, setCalendarYear] = useState<number>(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(new Date().getMonth());

  const portugueseMonths = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // Calendar calculations for MonthlyView
  const calendarDays = React.useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
    const offset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    const count = lastDay.getDate();
    
    const arr = [];
    for (let i = 0; i < offset; i++) {
      arr.push(null);
    }
    for (let d = 1; d <= count; d++) {
      arr.push(new Date(calendarYear, calendarMonth, d));
    }
    return arr;
  }, [calendarYear, calendarMonth]);

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

  const firstFiveTags = DIET_TAGS.slice(0, 5);
  const remainingTags = DIET_TAGS.slice(5);

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const activePlanId = userData.activeMonthlyDietPlanId;
  const plans = userData.monthlyDietPlans || [];
  const activePlan = plans.find((p) => p.id === activePlanId) || plans[0];

  const uses = getRemainingUses(userData, "monthlyPlanGenerations");

  const handleCreateMonthlyPlan = async () => {
    if (uses.remaining <= 0) {
      showNotification({
        type: "error",
        message:
          "Limite semanal/mensal atingido! Adquira mais créditos ou mude de plano nas Configurações.",
      });
      return;
    }
    try {
      showNotification({
        type: "loading",
        message: "Criando seu planejamento estratégico de 4 semanas...",
      });
      let finalObservation = "";
      if (mealCount !== "automatico") {
        finalObservation += `Gere o planejamento com exatamente ${mealCount} refeições diárias completas em cada fase. `;
      }
      if (selectedTags.length > 0) {
        finalObservation += `Tags: ${selectedTags.join(", ")}. `;
      }
      if (observation.trim()) {
        finalObservation += `Observações adicionais: ${observation.trim()}`;
      }
      await handlers.generateMonthlyPlan(finalObservation.trim());
      setObservation("");
      setSelectedTags([]);
      setSelectedPhaseNum(1);
      if (onPlanCreateSuccess) {
        onPlanCreateSuccess();
      }
    } catch (e: any) {
      // Notification handled by handlers wrapper
    }
  };

  const handleSelectPlan = (planId: string) => {
    handlers.updateUserData({ activeMonthlyDietPlanId: planId });
    setSelectedPhaseNum(1);
  };

  const handleDeletePlan = (planId: string) => {
    const updatedPlans = plans.filter((p) => p.id !== planId);
    let nextActiveId = activePlanId;
    if (activePlanId === planId) {
      nextActiveId = updatedPlans.length > 0 ? updatedPlans[0].id : null;
    }
    handlers.updateUserData({
      monthlyDietPlans: updatedPlans,
      activeMonthlyDietPlanId: nextActiveId,
    });
    showNotification({
      type: "success",
      message: "Plano mensal excluído com sucesso.",
    });
    setTimeout(() => showNotification(null), 2000);
  };

  const handleApplyPhaseToToday = (phase: MonthlyPhase) => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const daysArr = [
      "Domingo",
      "Segunda-feira",
      "Terça-feira",
      "Quarta-feira",
      "Quinta-feira",
      "Sexta-feira",
      "Sábado",
    ];
    const dayName = daysArr[today.getDay()];

    const updatedMeals = phase.meals.map((m, mIdx) => ({
      ...m,
      id: `applied_meal_${mIdx}_${Date.now()}`,
    }));

    const appliedPlan: DailyPlan = {
      date: todayStr,
      dayOfWeek: dayName,
      meals: updatedMeals,
      totalCalories: phase.macros.calories,
      totalMacros: {
        calories: phase.macros.calories,
        carbs: phase.macros.carbs,
        protein: phase.macros.protein,
        fat: phase.macros.fat,
      },
      waterGoal: 2.5,
      title: `Dia com ${phase.name}`,
      notes: `Fase aplicada do plano mensal estratégico: ${phase.focus}`,
    };

    setMealPlan((prev) => ({
      ...prev,
      [todayStr]: appliedPlan,
    }));

    // Update active macro goals for the user to fit the metabolic phase strategy!
    handlers.updateUserData({
      macros: {
        calories: { current: 0, goal: phase.macros.calories },
        carbs: { current: 0, goal: phase.macros.carbs },
        protein: { current: 0, goal: phase.macros.protein },
        fat: { current: 0, goal: phase.macros.fat },
      },
    });

    showNotification({
      type: "success",
      message: `Sucesso! A ${phase.duration} (${phase.name}) com seu foco de metabolização foi aplicada à sua dieta de HOJE!`,
    });
    setTimeout(() => showNotification(null), 3500);
  };

  const toggleMealExpand = (mealId: string) => {
    setExpandedMeals((prev) => ({
      ...prev,
      [mealId]: !prev[mealId],
    }));
  };

  const macroProgressWidth = (val: number, goal: number) => {
    if (!goal) return "0%";
    const pct = Math.min((val / goal) * 100, 100);
    return `${pct}%`;
  };

  return (
    <div className="space-y-8 animate-fade-in" id="monthly-diet-view-container">
      {/* HEADER SECTION */}
      <div className="bg-white p-6 rounded-2xl border border-rose-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-brand-green" />
            Criar Dieta Mensal ✨
          </h2>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Uma estratégia metabólica progressiva de 4 semanas (Fase de Adaptação, Consolidação, Pico e Estabilização) personalizada pela nossa inteligência artificial para o seu biotipo.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
          <button
            onClick={() => setIsCalendarExpanded(!isCalendarExpanded)}
            className={`py-2 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all ${
              isCalendarExpanded
                ? "bg-brand-green/10 text-brand-green-dark border-brand-green/35"
                : "bg-white text-slate-700 hover:text-brand-green hover:border-brand-green border-slate-200"
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>📅 Ver Calendário Completo</span>
          </button>

          {/* Usages badge */}
          <div className="bg-rose-50 px-4 py-2 rounded-xl text-center border border-rose-100">
            <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Uso Mensal</p>
            <p className="text-lg font-bold text-rose-900 mt-0.5 animate-pulse">
              {uses.remaining === Infinity ? "Sem Limites" : `${uses.remaining} / ${uses.limit}`}
            </p>
          </div>
        </div>
      </div>

      {/* Embedded Month & Year Calendar Explorer (Same as WeeklyView for absolute consistency) */}
      {isCalendarExpanded && (
        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-5 animate-fadeIn">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">
                🔍 Calendário Inteligente de Refeições
              </h4>
              <p className="text-xs text-slate-400">Toque em qualquer dia para abrir ou planejar sua dieta de forma direta</p>
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
            {/* Year Selector */}
            <div className="md:border-r border-slate-100 pr-0 md:pr-4 space-y-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Selecione o Mês do Ano</div>
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
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
                {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((dateVal, cellIdx) => {
                  if (!dateVal) {
                    return <div key={`empty-${cellIdx}`} className="bg-slate-50/20 rounded-lg aspect-square" />;
                  }

                  const dayStr = dateVal.toISOString().split("T")[0];
                  // Plan presence detection
                  const hasPlan = mealPlan && !!mealPlan[dayStr];
                  const isCurrentToday = new Date().toDateString() === dateVal.toDateString();

                  return (
                    <button
                      key={dayStr}
                      disabled={isProcessing}
                      onClick={() => {
                        if (onSelectDay) {
                          onSelectDay(dateVal);
                        }
                      }}
                      className={`aspect-square p-1 rounded-lg flex flex-col items-center justify-between border transition-all ${
                        isCurrentToday
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

      {/* HISTORIC PLANS REGION */}
      {plans.length > 0 && (
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wilder">Seus Planos Mensais:</span>
          <div className="flex flex-wrap items-center gap-2">
            {plans.map((pn) => (
              <div 
                key={pn.id} 
                className={`relative flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                  activePlan?.id === pn.id 
                    ? "bg-brand-green-light border-brand-green/30 text-brand-green-dark" 
                    : "bg-slate-50 border-gray-200 text-slate-600 hover:bg-slate-100"
                }`}
                onClick={() => handleSelectPlan(pn.id)}
              >
                <span>{pn.title}</span>
                <span className="text-[10px] opacity-60">
                  ({new Date(pn.createdAt).toLocaleDateString("pt-BR")})
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeletePlan(pn.id);
                  }}
                  className="p-1 hover:text-red-600 transition-colors"
                  title="Excluir este plano"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GENERATE FORM */}
      <div className="bg-brand-green-light/40 p-6 rounded-2xl border border-brand-green/10 space-y-4">
        <div className="flex items-start gap-4">
          <div className="bg-white p-3 rounded-xl border border-brand-green/10 shadow-sm shrink-0">
            <SparklesIcon className="w-6 h-6 text-brand-green" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-brand-green-dark">Iniciar Nova Estratégia de 4 Semanas</h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Especifique objetivos específicos ou alergias temporárias que devem ser aplicadas nas 4 fases.
            </p>
          </div>
        </div>

        {/* Custom Meal Count Selector Option (matches Weekly for absolute perfection) */}
        <div className="bg-white/80 p-3.5 rounded-xl border border-slate-100 mt-2">
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
                {opt === "automatico" ? "Deixar IA decidir" : `${opt} refeições`}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic AI Customization Tags */}
        <div className="space-y-2 mt-2">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-semibold text-slate-700">
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
              aria-controls="diet-tags-container-monthly"
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
                className={`px-3 py-1.5 text-xs font-semibold rounded-full border-2 transition-colors disabled:opacity-50 ${
                  selectedTags.includes(tag)
                    ? "bg-brand-green text-white border-brand-green"
                    : "bg-white text-slate-600 border border-slate-300 hover:border-brand-green hover:text-brand-green"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          <div
            id="diet-tags-container-monthly"
            className={`tags-container ${isTagsExpanded ? "" : "collapsed"}`}
          >
            <div className="flex flex-wrap gap-2 pt-2">
              {remainingTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  disabled={isProcessing}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full border-2 transition-colors disabled:opacity-50 ${
                    selectedTags.includes(tag)
                      ? "bg-brand-green text-white border-brand-green"
                      : "bg-white text-slate-600 border border-slate-300 hover:border-brand-green hover:text-brand-green"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-2">
          <label className="block text-sm font-semibold text-slate-700 mb-1">
            Outras observações / instruções para a IA (opcional)
          </label>
          <textarea
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            placeholder="Ex: Quero um foco maior em ganho de massa magra, com alimentos simples e fáceis de preparar, sem glúten se possível..."
            rows={2}
            className="w-full p-3.5 rounded-xl border border-gray-200 bg-white text-slate-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-green/30 focus:border-brand-green text-sm"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
          <div className="text-xs text-slate-500">
            * Cada plano gera 4 fases independentes que você escolhe quando ativar.
          </div>
          <button
            onClick={handleCreateMonthlyPlan}
            disabled={isProcessing || uses.remaining <= 0}
            className="bg-brand-green hover:bg-brand-green-dark text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-sm disabled:bg-slate-400 disabled:cursor-not-allowed text-sm font-semibold shrink-0"
          >
            <SparklesIcon className="w-4 h-4 text-white" />
            {isProcessing ? "Gerando Dieta..." : "Gerar Dieta Mensal"}
          </button>
        </div>
      </div>

      {/* ACTIVE PLAN CONTAINER */}
      {activePlan ? (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="bg-brand-green/10 text-brand-green-dark text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
                Plano Ativo
              </span>
              <span className="text-xs text-slate-400">
                Criado em {new Date(activePlan.createdAt).toLocaleDateString("pt-BR", { dateStyle: "long" })}
              </span>
            </div>
            <h3 className="text-xl font-bold text-slate-800">{activePlan.title}</h3>
            <p className="text-slate-600 text-sm leading-relaxed">{activePlan.description}</p>
          </div>

          {/* FAZE TOGGLERS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {activePlan.phases.map((ph) => (
              <button
                key={ph.phaseNumber}
                onClick={() => setSelectedPhaseNum(ph.phaseNumber)}
                className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden ${
                  selectedPhaseNum === ph.phaseNumber
                    ? "bg-brand-green text-white border-brand-green shadow-md translate-y-[-2px]"
                    : "bg-white border-gray-200 text-slate-700 hover:bg-slate-50 hover:border-gray-300"
                }`}
              >
                <div className={`text-[10px] font-bold uppercase tracking-wider ${
                  selectedPhaseNum === ph.phaseNumber ? "text-white/80" : "text-brand-green"
                }`}>
                  {ph.duration}
                </div>
                <div className="font-bold text-sm mt-1 truncate">{ph.name}</div>
                <div className={`text-xs mt-0.5 truncate ${
                  selectedPhaseNum === ph.phaseNumber ? "text-white/70" : "text-slate-400"
                }`}>
                  {ph.focus}
                </div>
              </button>
            ))}
          </div>

          {/* ACTIVE PHASE BOARD DETAILS */}
          {(() => {
            const currentPhase = activePlan.phases.find((p) => p.phaseNumber === selectedPhaseNum);
            if (!currentPhase) return null;

            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* MACROS & TIPS */}
                <div className="lg:col-span-1 space-y-6">
                  {/* Macros target */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                    <h4 className="font-bold text-slate-800">Alvo Nutricional da Fase</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Calorias</span>
                        <span className="text-lg font-extrabold text-slate-850 mt-0.5">{currentPhase.macros.calories} kcal</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Proteína</span>
                        <span className="text-lg font-extrabold text-slate-850 mt-0.5">{currentPhase.macros.protein} g</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Carbo</span>
                        <span className="text-lg font-extrabold text-slate-850 mt-0.5">{currentPhase.macros.carbs} g</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col justify-center">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Gordura</span>
                        <span className="text-lg font-extrabold text-slate-850 mt-0.5">{currentPhase.macros.fat} g</span>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <div className="text-xs text-slate-500 leading-relaxed">
                        <span className="font-bold text-slate-700">Filtro Metabólico:</span> Esta semana foi estrategicamente projetada para {currentPhase.focus.toLowerCase()} garantindo nutrição adaptativa de alta eficiência.
                      </div>
                    </div>
                  </div>

                  {/* Habits & lifestyle tips */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm uppercase tracking-wide">
                      <StarIcon className="w-5 h-5 text-yellow-500" />
                      Hábitos Recomendados
                    </h4>
                    <ul className="space-y-2.5">
                      {currentPhase.lifestyleTips.map((tip, idx) => (
                        <li key={idx} className="flex gap-2 text-xs text-slate-600 leading-relaxed">
                          <CheckIcon className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Shopping excerpt */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm uppercase tracking-wide">
                      <ListIcon className="w-5 h-5 text-indigo-500" />
                      Checklist do Supermercado
                    </h4>
                    <p className="text-[11px] text-slate-400">Ingredientes primordiais para ter em estoque nesta fase:</p>
                    <div className="grid grid-cols-1 gap-2">
                      {currentPhase.shoppingListExcerpt.map((shopItem, sIdx) => (
                        <div key={sIdx} className="bg-slate-50 border border-slate-100 rounded-lg p-2 flex items-center gap-2 text-xs text-slate-700">
                          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0"></div>
                          <span>{shopItem}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* MEAL TEMPLATE LIST OVERVIEW */}
                <div className="lg:col-span-2 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 flex items-center gap-1.5">
                      <UtensilsIcon className="w-5 h-5 text-brand-green" />
                      Refeições Guia ({currentPhase.meals.length})
                    </h4>
                    <span className="text-xs text-slate-400">Clique na refeição para abrir a lista de alimentos</span>
                  </div>

                  <div className="space-y-3">
                    {currentPhase.meals.map((meal) => {
                      const isExpanded = expandedMeals[meal.id] ?? false;
                      return (
                        <div key={meal.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs transition-colors hover:border-gray-300">
                          <div 
                            onClick={() => toggleMealExpand(meal.id)}
                            className="p-4 flex items-center justify-between cursor-pointer select-none bg-slate-50/50"
                          >
                            <div className="flex items-center gap-3">
                              <span className="px-2 py-1 bg-white border border-gray-200 text-[10px] font-bold text-slate-400 rounded-md">
                                {meal.time}
                              </span>
                              <div>
                                <h5 className="font-bold text-slate-850 text-sm">{meal.name}</h5>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  {meal.items.length} {meal.items.length === 1 ? "item" : "itens"} na refeição
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right shrink-0">
                                <span className="text-xs font-semibold text-brand-green bg-brand-green-light px-2.5 py-1 rounded-full">
                                  {meal.totalCalories || meal.totalMacros?.calories} kcal
                                </span>
                              </div>
                              {isExpanded ? (
                                <ChevronUpIcon className="w-5 h-5 text-gray-450" />
                              ) : (
                                <ChevronDownIcon className="w-5 h-5 text-gray-450" />
                              )}
                            </div>
                          </div>

                          {/* EXPANDABLE ITEMS LIST */}
                          {isExpanded && (
                            <div className="p-4 border-t border-gray-150 space-y-3 bg-white">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {meal.items.map((it, idx) => (
                                  <div key={idx} className="bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-1">
                                    <div className="flex items-start justify-between">
                                      <h6 className="font-bold text-slate-800 text-xs">{it.name}</h6>
                                      <span className="text-[10px] bg-slate-200 text-slate-650 px-2 py-0.5 rounded-md font-semibold shrink-0">
                                        {it.portion}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 pt-1 font-mono text-[10px] text-slate-500">
                                      <span>🔥 {it.calories} kcal</span>
                                      <span>•</span>
                                      <span>P: {it.protein}g</span>
                                      <span>•</span>
                                      <span>C: {it.carbs}g</span>
                                      <span>•</span>
                                      <span>G: {it.fat}g</span>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* MEAL MACROS SUM */}
                              <div className="bg-slate-100 border border-slate-200/50 rounded-xl p-3 mt-4 flex justify-between items-center text-xs font-mono">
                                <span className="font-bold text-slate-600 uppercase tracking-widest text-[10px]">Total Macros:</span>
                                <div className="space-x-3 text-slate-700">
                                  <span>P: <strong className="text-slate-900">{meal.totalMacros?.protein || 0}g</strong></span>
                                  <span>C: <strong className="text-slate-900">{meal.totalMacros?.carbs || 0}g</strong></span>
                                  <span>G: <strong className="text-slate-900">{meal.totalMacros?.fat || 0}g</strong></span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            );
          })()}

        </div>
      ) : (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center justify-center">
          <CalendarIcon className="w-16 h-16 text-slate-300 mb-4" />
          <h4 className="text-lg font-bold text-slate-800 mb-1">Nenhum plano mensal ativo</h4>
          <p className="text-sm text-slate-500 max-w-md">
            Você ainda não possui planos de nutrição integrados de 4 semanas. Digite um objetivo ou observação opcional no formulário acima e clique em "Gerar Dieta Mensal" para começar!
          </p>
        </div>
      )}
    </div>
  );
};
