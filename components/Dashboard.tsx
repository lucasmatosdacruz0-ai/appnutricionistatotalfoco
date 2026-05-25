

import React, { useState, useMemo, useEffect } from 'react';
import InfoCard from './InfoCard';
import Modal from './Modal';
import LogMealModal from './LogMealModal';
import WaterReminderModal from './WaterReminderModal';
import AdjustGoalModal from './AdjustGoalModal';
import { WaterReminderSettings, UserData, UserDataHandlers, View, DietDifficulty, DailyPlan, UserMacros } from '../types';
import { GraphIcon } from './icons/GraphIcon';
import { FireIcon } from './icons/FireIcon';
import { WaterDropletsIcon } from './icons/WaterDropletsIcon';
import { ClockIcon } from './icons/ClockIcon';
import { CalendarIcon } from './icons/CalendarIcon';
import { UtensilsIcon } from './icons/UtensilsIcon';
import { BellIcon } from './icons/BellIcon';
import { UserIcon } from './icons/UserIcon';
import { EditIcon } from './icons/EditIcon';
import { CheckIcon } from './icons/CheckIcon';
import { TrophyIcon } from './icons/TrophyIcon';
import { calculateXPForLevel } from './utils/xpUtils';
import { QuestionMarkCircleIcon } from './icons/QuestionMarkCircleIcon';
import SubscriptionCTA from './SubscriptionCTA';
// FIX: Import DietModeSelector from PlanoAlimentarView to ensure consistent UI and logic.
import { DietModeSelector } from './PlanoAlimentarView';
// FIX: Import TodaysDietCard
import TodaysDietCard from './TodaysDietCard';
import { SparklesIcon } from './icons/SparklesIcon';


interface DashboardProps {
    userData: UserData;
    handlers: UserDataHandlers;
    setActiveView: (view: View) => void;
    // The `mealPlan` prop is not directly used in this component.
    mealPlan: Record<string, DailyPlan> | null; 
}

const Dashboard: React.FC<DashboardProps> = ({ userData, handlers, setActiveView, mealPlan }) => {
    const { name, weight, water, macros, waterReminders, initialWeight, weightGoal, waterGoal, profilePicture, streak, completedDays, level, xp } = userData;
    const { updateUserData, addWater, handleLogMeal, handleUpdateWeight, handleMarkDayAsCompleted, handleChangeDietDifficulty } = handlers;
    
    const isDark = userData.darkMode || userData.dietDifficulty === 'athlete';
    
    const [isWeightModalOpen, setWeightModalOpen] = useState(false);
    const [isMealModalOpen, setMealModalOpen] = useState(false);
    const [isWaterReminderModalOpen, setWaterReminderModalOpen] = useState(false);
    const [isAdjustGoalModalOpen, setAdjustGoalModalOpen] = useState(false);
    
    const [newWeight, setNewWeight] = useState(weight.toString());

    const waterProgress = useMemo(() => Math.min((water / waterGoal) * 100, 100), [water, waterGoal]);
    const weightProgress = useMemo(() => {
        const start = initialWeight;
        const end = weightGoal;
        const current = weight;

        if (start === end) {
            return start === current ? 100 : 0;
        }

        const progress = ((current - start) / (end - start)) * 100;

        return Math.max(0, Math.min(progress, 100));
    }, [weight, initialWeight, weightGoal]);

    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
    const isTodayCompleted = useMemo(() => completedDays.includes(todayStr), [completedDays, todayStr]);

    const todaysPlan = useMemo(() => {
        if (!mealPlan) return null;
        const todayKey = new Date().toISOString().split('T')[0];
        return mealPlan[todayKey];
    }, [mealPlan]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 5) return { text: 'Boa noite', emoji: '🌙', style: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20' };
        if (hour < 12) return { text: 'Bom dia', emoji: '☀️', style: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
        if (hour < 18) return { text: 'Boa tarde', emoji: '🌤️', style: 'text-orange-400 bg-orange-500/10 border-orange-500/20' };
        return { text: 'Boa noite', emoji: '🌙', style: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20' };
    };

    const formatDate = () => {
        const date = new Date();
        const formatter = new Intl.DateTimeFormat('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        });
        const parts = formatter.formatToParts(date);
        let formattedDate = '';
        parts.forEach(part => {
           if(part.type === 'weekday') {
                formattedDate += part.value.charAt(0).toUpperCase() + part.value.slice(1);
           } else {
               formattedDate += part.value;
           }
        });
        return formattedDate.replace('-feira', '-feira,');
    };

    const handleSaveWeight = (e: React.FormEvent) => {
        e.preventDefault();
        const weightValue = parseFloat(newWeight);
        if (!isNaN(weightValue) && weightValue > 0) {
            handleUpdateWeight(weightValue);
        }
        setWeightModalOpen(false);
    };
    
    // FIX: Updated `handleSaveNewGoal` to pass `newMacros` to `updateUserData`
    const handleSaveNewGoal = (newWeightGoal: number, newMacros: UserMacros) => {
        updateUserData({
            weightGoal: newWeightGoal,
            macros: newMacros
        });
        setAdjustGoalModalOpen(false);
    };

    const handleSaveWaterReminders = (settings: WaterReminderSettings) => {
        updateUserData({ waterReminders: settings });
        setWaterReminderModalOpen(false);

        if (settings.enabled && Notification.permission !== 'granted') {
             Notification.requestPermission().then(permission => {
                if (permission !== 'granted') {
                    alert("As notificações foram bloqueadas. Para ativá-las, mude as permissões do site no seu navegador.");
                    updateUserData({ waterReminders: { ...settings, enabled: false } });
                }
            });
        }
    };

    useEffect(() => {
        if (typeof window === 'undefined' || !('Notification' in window)) {
            return;
        }

        if (!waterReminders.enabled || Notification.permission !== 'granted') {
            return;
        }

        const scheduledTimers: ReturnType<typeof setTimeout>[] = [];

        waterReminders.times.forEach(time => {
            const [hour, minute] = time.split(':').map(Number);
            const now = new Date();
            const reminderDate = new Date();
            reminderDate.setHours(hour, minute, 0, 0);

            if (reminderDate > now) {
                const timeout = reminderDate.getTime() - now.getTime();
                const timerId = setTimeout(() => {
                    new Notification('Hora de beber água! 💧', {
                        body: 'Lembre-se de se manter hidratado para atingir sua meta diária.',
                        icon: '/favicon.svg' 
                    });
                }, timeout);
                scheduledTimers.push(timerId);
            }
        });
        
        return () => {
            scheduledTimers.forEach(clearTimeout);
        };
    }, [waterReminders]);

    const LevelBadgeButton = () => {
        const xpForNextLevel = calculateXPForLevel(level);
        const xpProgress = xpForNextLevel > 0 ? (xp / xpForNextLevel) * 100 : 0;
        const radius = 19;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (xpProgress / 100) * circumference;
    
        return (
            <button
                onClick={() => setActiveView('Conquistas')}
                className="level-badge-button"
                title={`Nível ${level} - Clique para ver suas conquistas`}
                aria-label={`Nível ${level}, ${Math.floor(xp)} de ${xpForNextLevel} XP. Ver conquistas.`}
            >
                <TrophyIcon className="level-badge-icon" />
                <span className="level-badge-text">{level}</span>
                <svg className="level-badge-progress-ring" width="44" height="44" viewBox="0 0 44 44">
                    <circle
                        cx="22" cy="22" r={radius} strokeWidth="3"
                        className="stroke-slate-200"
                        fill="transparent"
                    />
                    <circle
                        cx="22" cy="22" r={radius} strokeWidth="3"
                        className="stroke-amber-400"
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                    />
                </svg>
            </button>
        );
    };

    const greeting = getGreeting();
    const namePart = name?.trim() ? `, ${name.trim()}` : '';

  return (
    <div className="flex flex-col gap-4 md:gap-5">
      {!userData.isSubscribed && (
        <div className="md:hidden">
            <SubscriptionCTA
                onOpenSubscriptionModal={handlers.openSubscriptionModal}
                trialEndDate={userData.trialEndDate}
            />
        </div>
      )}
      <header className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-4 md:p-5 shadow-xl border border-slate-800">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-brand-green/20 to-indigo-500/20 rounded-full blur-3xl opacity-50 pointer-events-none -mr-12 -mt-12"></div>
          
          <div className="relative flex flex-row justify-between items-start gap-1 sm:gap-4">
              {/* Left Side: Avatar + Greeting & Date */}
              <div className="flex items-center gap-2.5 md:gap-3.5 min-w-0">
                  <div className="relative flex-shrink-0">
                      <button 
                          onClick={() => setActiveView('Conta')} 
                          className="relative group w-12 h-12 md:w-14 md:h-14 rounded-full bg-slate-800 flex items-center justify-center border-2 border-slate-700 shadow-inner hover:border-brand-green transition-all duration-300 hover:scale-105"
                          title="Ir para o perfil"
                      >
                          {profilePicture ? (
                              <img src={profilePicture} alt="Perfil" className="w-full h-full rounded-full object-cover" />
                          ) : (
                              <UserIcon className="w-6 h-6 md:w-7 md:h-7 text-slate-400 group-hover:text-white transition-colors" />
                          )}
                          <div className="absolute -bottom-0.5 -right-0.5 bg-brand-green p-1 rounded-full border border-slate-950 shadow-md">
                               <EditIcon className="w-2.5 h-2.5 text-slate-950" />
                          </div>
                      </button>
                  </div>

                  <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9.5px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border backdrop-blur-sm shadow-sm transition-colors ${greeting.style}`}>
                              {greeting.text}
                          </span>
                          <span className="text-sm leading-none animate-bounce-slow">
                              {greeting.emoji}
                          </span>
                      </div>
                      
                      <h2 className="text-lg md:text-xl font-black text-white mt-1 tracking-tight truncate leading-tight">
                          {name?.trim() ? name.trim() : 'Campeão'}!
                      </h2>
                      
                      <p className="text-[10px] md:text-xs font-semibold text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-brand-green rounded-full animate-pulse"></span>
                          {formatDate()}
                      </p>
                  </div>
              </div>

              {/* Right Side: Level + Signature Action Buttons (Stacked Vertically - Slightly Enlarged) */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0 self-start">
                  <div className="flex items-center gap-1.5 bg-slate-900/60 backdrop-blur-md px-2 py-1.5 rounded-lg border border-slate-800 shadow-inner">
                      {(() => {
                          const xpForNextLevel = calculateXPForLevel(level);
                          const xpProgress = xpForNextLevel > 0 ? (xp / xpForNextLevel) * 100 : 0;
                          const radius = 14;
                          const circumference = 2 * Math.PI * radius;
                          const strokeDashoffset = circumference - (xpProgress / 100) * circumference;
                          return (
                              <button
                                  onClick={() => setActiveView('Conquistas')}
                                  className="relative w-8 h-8 rounded-full bg-slate-950/80 flex items-center justify-center cursor-pointer transition-all hover:scale-110 shadow-sm flex-shrink-0"
                                  title={`Nível ${level} - Clique para ver suas conquistas`}
                                  aria-label={`Nível ${level}, ${Math.floor(xp)} de ${xpForNextLevel} XP. Ver conquistas.`}
                              >
                                  <TrophyIcon className="text-amber-500/15 w-3.5 h-3.5 absolute z-10" />
                                  <span className="text-[10px] font-black text-amber-500 relative z-20">{level}</span>
                                  <svg className="absolute top-0 left-0 w-full h-full -rotate-90" viewBox="0 0 44 44">
                                      <circle
                                          cx="22" cy="22" r={radius} strokeWidth="3"
                                          className="stroke-slate-800"
                                          fill="transparent"
                                      />
                                      <circle
                                          cx="22" cy="22" r={radius} strokeWidth="3"
                                          className="stroke-amber-400"
                                          fill="transparent"
                                          strokeDasharray={2 * Math.PI * radius}
                                          strokeDashoffset={strokeDashoffset}
                                          strokeLinecap="round"
                                      />
                                  </svg>
                              </button>
                          );
                      })()}
                      <div className="flex flex-col text-left">
                          <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-widest leading-none">Nível</span>
                          <span className="text-[10.5px] font-black text-white mt-0.5 leading-none">{level}</span>
                      </div>
                  </div>

                  <button
                      onClick={() => setActiveView('Gerenciar Assinatura')}
                      className="bg-gradient-to-r from-brand-green to-emerald-400 text-slate-950 font-black text-[9.5px] xs:text-[10.5px] md:text-xs px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm border border-brand-green/20"
                  >
                      <SparklesIcon className="w-3.5 h-3.5 text-slate-950" strokeWidth={2.5} />
                      <span>ASSINATURA</span>
                  </button>

                  {!userData.isSubscribed && (
                      <div className="hidden md:flex bg-amber-500/10 text-amber-300 text-[9px] font-bold px-2 py-1.5 rounded-lg items-center gap-1 border border-amber-500/20">
                          <ClockIcon className="w-3 h-3 text-amber-400" />
                          <span className="tracking-wide">TESTE ATIVO</span>
                      </div>
                  )}
              </div>
          </div>
      </header>
      
      <DietModeSelector 
        currentDifficulty={userData.dietDifficulty} 
        onChange={handleChangeDietDifficulty}
        isSubscribed={userData.isSubscribed}
        openSubscriptionModal={handlers.openSubscriptionModal}
        isDark={isDark}
      />

      <div className={`backdrop-blur-sm p-3.5 rounded-xl shadow-sm flex flex-col gap-2 border transition-all duration-300 ${
          isDark 
            ? "bg-slate-800/80 border-slate-750 text-slate-100" 
            : "bg-white/80 border-gray-100 text-slate-800"
      }`}>
          <div className="flex justify-between items-center text-xs md:text-sm font-medium">
              <h3 className={`flex-1 transition-colors ${isDark ? "text-slate-300" : "text-slate-600"}`}>Progresso da meta de peso</h3>
              <button onClick={() => setAdjustGoalModalOpen(true)} className="text-[11px] md:text-xs font-semibold text-brand-green hover:underline">Ajustar meta</button>
              <span className={`font-bold ml-4 transition-colors ${isDark ? "text-slate-200" : "text-slate-800"}`}>{weight.toFixed(1)}kg <span className={`transition-colors ${isDark ? "text-slate-500" : "text-slate-400"} font-normal`}>/ {weightGoal.toFixed(1)}kg</span></span>
          </div>
          <div className={`w-full rounded-full h-2 overflow-hidden transition-colors ${
              isDark ? "bg-slate-700/50" : "bg-slate-100"
          }`}>
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_12px_rgba(59,130,246,0.2)]" style={{ width: `${weightProgress}%` }}></div>
          </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-4 md:gap-4">
        <InfoCard
            icon={<GraphIcon className="text-emerald-600 theme-dark:text-emerald-400 theme-athlete:text-emerald-400" />}
            iconBg="bg-emerald-100/80 border border-emerald-200 theme-dark:bg-emerald-950/40 theme-athlete:bg-emerald-950/40 theme-dark:border-emerald-900/30 theme-athlete:border-emerald-900/30"
            bgClassName="bg-gradient-to-br from-emerald-50/90 via-white/95 to-teal-100/40 border-emerald-100/90 shadow-sm theme-dark:from-slate-800/80 theme-athlete:from-slate-800/80 theme-dark:via-slate-800/90 theme-athlete:via-slate-800/90 theme-dark:to-emerald-950/20 theme-athlete:to-emerald-950/20 theme-dark:border-emerald-900/30 theme-athlete:border-emerald-900/30"
        >
            <h3 className="text-emerald-800 font-bold text-sm md:text-base theme-dark:text-emerald-200 theme-athlete:text-emerald-200">Peso Atual</h3>
            <p className="text-2xl md:text-3xl font-extrabold my-1 text-slate-800 theme-dark:text-slate-100 theme-athlete:text-slate-100">{weight.toFixed(1)} <span className="text-sm md:text-base font-medium text-slate-400 theme-dark:text-slate-500 theme-athlete:text-slate-500">kg</span></p>
            <button onClick={() => { setNewWeight(weight.toString()); setWeightModalOpen(true); }} className="mt-3 w-full bg-gradient-to-r from-brand-green to-teal-500 hover:from-brand-green-dark hover:to-teal-600 shadow-md hover:shadow-lg text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all duration-200">
                Registrar
            </button>
        </InfoCard>

        <InfoCard 
            icon={<WaterDropletsIcon className="text-sky-500 theme-dark:text-sky-400 theme-athlete:text-sky-400"/>} 
            iconBg="bg-sky-100 border border-sky-200 theme-dark:bg-sky-950/40 theme-athlete:bg-sky-950/40 theme-dark:border-sky-900/30 theme-athlete:border-sky-900/30"
            bgClassName="bg-gradient-to-br from-sky-50/90 via-white/95 to-blue-100/40 border-sky-100/90 shadow-sm theme-dark:from-slate-800/80 theme-athlete:from-slate-800/80 theme-dark:via-slate-800/90 theme-athlete:via-slate-800/90 theme-dark:to-sky-950/20 theme-athlete:to-sky-950/20 theme-dark:border-sky-900/30 theme-athlete:border-sky-900/30"
        >
           <div className="flex justify-between items-center mb-1">
                <h3 className="text-sky-800 font-bold text-sm md:text-base theme-dark:text-sky-200 theme-athlete:text-sky-200">Água</h3>
                 <button onClick={() => setWaterReminderModalOpen(true)} className="p-1 rounded-full hover:bg-sky-200/50 theme-dark:hover:bg-slate-700 theme-athlete:hover:bg-slate-700 transition-colors -mr-2 -mt-2">
                    <BellIcon className={`w-5 h-5 ${waterReminders.enabled ? 'text-blue-500 theme-athlete:text-sky-400 animate-pulse' : 'text-gray-400'}`} />
                </button>
            </div>
           <p className="text-2xl md:text-3xl font-extrabold text-slate-800 theme-dark:text-slate-100 theme-athlete:text-slate-100">{water.toFixed(2)}<span className="text-sm md:text-base font-normal text-slate-400 theme-dark:text-slate-500 theme-athlete:text-slate-500"> / {waterGoal.toFixed(1)}L</span></p>
           <div className="w-full bg-slate-100 theme-athlete:bg-slate-700/50 rounded-full h-2 mt-3 overflow-hidden">
                <div className="bg-gradient-to-r from-sky-400 to-blue-500 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(56,189,248,0.25)]" style={{width: `${waterProgress}%`}}></div>
           </div>
           <div className="flex gap-2 mt-3">
            <button onClick={() => addWater(0.250)} className="flex-1 text-xs bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-2 rounded-lg transition-colors shadow-sm theme-dark:bg-sky-650 theme-athlete:bg-sky-650 theme-dark:hover:bg-sky-700 theme-athlete:hover:bg-sky-700">+250ml</button>
            <button onClick={() => addWater(0.500)} className="flex-1 text-xs bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-2 rounded-lg transition-colors shadow-sm theme-dark:bg-sky-650 theme-athlete:bg-sky-650 theme-dark:hover:bg-sky-700 theme-athlete:hover:bg-sky-700">+500ml</button>
           </div>
         </InfoCard>

         <InfoCard 
            icon={<UtensilsIcon className="text-purple-600 theme-dark:text-purple-400 theme-athlete:text-purple-400"/>} 
            iconBg="bg-purple-100 border border-purple-200 theme-dark:bg-purple-950/40 theme-athlete:bg-purple-950/40 theme-dark:border-purple-900/30 theme-athlete:border-purple-900/30"
            bgClassName="bg-gradient-to-br from-purple-50/90 via-white/95 to-indigo-100/40 border-purple-100/90 shadow-sm theme-dark:from-slate-800/80 theme-athlete:from-slate-800/80 theme-dark:via-slate-800/90 theme-athlete:via-slate-800/90 theme-dark:to-purple-950/20 theme-athlete:to-purple-950/20 theme-dark:border-purple-900/30 theme-athlete:border-purple-900/30"
         >
             <h3 className="text-purple-800 font-bold text-sm md:text-base theme-dark:text-purple-200 theme-athlete:text-purple-200">Registrar Refeição</h3>
             <p className="text-purple-650 text-xs md:text-sm my-1 leading-tight mb-2 theme-dark:text-purple-300/80 theme-athlete:text-purple-300/80">Analise sua comida com IA, por texto ou foto.</p>
             <button 
                 onClick={() => setMealModalOpen(true)} 
                 className="mt-auto w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md hover:shadow-lg text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all duration-200"
             >
                 Registrar Refeição
             </button>
         </InfoCard>
         
         <InfoCard 
             icon={<FireIcon className="text-amber-600 theme-dark:text-amber-400 theme-athlete:text-amber-400"/>} 
             iconBg="bg-amber-100 border border-amber-200 theme-dark:bg-amber-950/40 theme-athlete:bg-amber-950/40 theme-dark:border-amber-900/30 theme-athlete:border-amber-900/30"
             bgClassName="bg-gradient-to-br from-amber-50/90 via-white/95 to-orange-100/40 border-amber-100/90 shadow-sm theme-dark:from-slate-800/80 theme-athlete:from-slate-800/80 theme-dark:via-slate-800/90 theme-athlete:via-slate-800/90 theme-dark:to-amber-950/20 theme-athlete:to-amber-950/20 theme-dark:border-amber-900/30 theme-athlete:border-amber-900/30"
         >
             <h3 className="text-amber-800 font-bold text-sm md:text-base theme-dark:text-amber-200 theme-athlete:text-amber-200">Sequência de Metas</h3>
             <p className="text-2xl md:text-3xl font-extrabold my-1 text-slate-800 theme-dark:text-slate-100 theme-athlete:text-slate-100">{streak} <span className="text-sm md:text-base font-normal text-slate-400 theme-dark:text-slate-500 theme-athlete:text-slate-500">dias</span></p>
             <button 
                 onClick={handleMarkDayAsCompleted} 
                 disabled={isTodayCompleted}
                 className="mt-3 w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 shadow-md hover:shadow-lg disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all duration-200 disabled:from-slate-400 disabled:to-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
             >
                 {isTodayCompleted ? <><CheckIcon className="w-5 h-5"/> Meta Concluída</> : 'Concluir Meta'}
             </button>
         </InfoCard>

         <InfoCard 
             icon={<FireIcon className="text-rose-500 theme-dark:text-rose-400 theme-athlete:text-rose-400"/>} 
             iconBg="bg-rose-100 border border-rose-200 theme-dark:bg-rose-950/40 theme-athlete:bg-rose-950/40 theme-dark:border-rose-900/30 theme-athlete:border-rose-900/30"
             bgClassName="bg-gradient-to-br from-rose-50/90 via-white/95 to-orange-100/40 border-rose-100/90 shadow-sm theme-dark:from-slate-800/80 theme-athlete:from-slate-800/80 theme-dark:via-slate-800/90 theme-athlete:via-slate-800/90 theme-dark:to-rose-950/20 theme-athlete:to-rose-950/20 theme-dark:border-rose-900/30 theme-athlete:border-rose-900/30"
         >
             <h3 className="text-rose-800 font-bold text-sm md:text-base theme-dark:text-rose-200 theme-athlete:text-rose-200">Calorias</h3>
             <p className="text-2xl md:text-3xl font-extrabold my-1 text-slate-800 theme-dark:text-slate-100 theme-athlete:text-slate-100">{macros.calories.current}
                 <span className="text-sm md:text-base font-normal text-slate-400 theme-dark:text-slate-500 theme-athlete:text-slate-500"> / {macros.calories.goal}kcal</span>
             </p>
             <div className="w-full bg-slate-100 theme-athlete:bg-slate-700/50 rounded-full h-2 mt-3 overflow-hidden">
                 <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(249,115,22,0.25)]" style={{ width: `${Math.min((macros.calories.current / macros.calories.goal) * 100, 100)}%` }}></div>
             </div>
         </InfoCard>
         
         <InfoCard 
             icon={<QuestionMarkCircleIcon className="text-blue-600 theme-dark:text-blue-400 theme-athlete:text-blue-400"/>} 
             iconBg="bg-blue-100 border border-blue-200 theme-dark:bg-blue-950/40 theme-athlete:bg-blue-950/40 theme-dark:border-blue-900/30 theme-athlete:border-blue-900/30"
             bgClassName="bg-gradient-to-br from-blue-50/70 via-white/95 to-indigo-100/40 border-blue-100/90 shadow-sm theme-dark:from-slate-800/80 theme-athlete:from-slate-800/80 theme-dark:via-slate-800/90 theme-athlete:via-slate-800/90 theme-dark:to-indigo-950/20 theme-athlete:to-indigo-950/20 theme-dark:border-indigo-900/30 theme-athlete:border-indigo-900/30"
         >
             <h3 className="text-blue-800 font-bold text-sm md:text-base theme-dark:text-blue-200 theme-athlete:text-blue-200">Ajuda & Tutorial</h3>
             <p className="text-blue-650 text-xs md:text-sm my-1 leading-tight mb-2 theme-dark:text-blue-300/80 theme-athlete:text-blue-300/80">Não sabe por onde começar? Refaça nosso tour guiado.</p>
             <button 
                 onClick={handlers.startTutorial} 
                 className="mt-auto w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all duration-200"
             >
                 Iniciar Tour
             </button>
         </InfoCard>

        {/* FIX: Use TodaysDietCard to display current day's meal plan */}
        <TodaysDietCard plan={todaysPlan} setActiveView={setActiveView} className="col-span-2 shadow-sm" isDark={isDark} />
        
        <InfoCard 
            icon={<CalendarIcon className="text-brand-green"/>} 
            iconBg="bg-brand-green-light"
            className="col-span-2"
        >
            <h3 className="text-slate-800 font-bold mb-3 text-lg">Macronutrientes de Hoje</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-4">
                <div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-slate-600">Carboidratos</span>
                        <span className="font-bold text-slate-800">{macros.carbs.current}g <span className="text-slate-400 font-normal">/ {macros.carbs.goal}g</span></span>
                    </div>
                    <div className="w-full bg-slate-100 theme-athlete:bg-slate-700/50 rounded-full h-2 mt-1.5 overflow-hidden">
                        <div className="bg-gradient-to-r from-sky-400 to-blue-500 h-full rounded-full shadow-[0_0_10px_rgba(56,189,248,0.25)]" style={{ width: `${Math.min((macros.carbs.current / macros.carbs.goal) * 100, 100)}%` }}></div>
                    </div>
                </div>
                <div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-slate-600">Proteínas</span>
                        <span className="font-bold text-slate-800">{macros.protein.current}g <span className="text-slate-400 font-normal">/ {macros.protein.goal}g</span></span>
                    </div>
                    <div className="w-full bg-slate-100 theme-athlete:bg-slate-700/50 rounded-full h-2 mt-1.5 overflow-hidden">
                        <div className="bg-gradient-to-r from-emerald-400 to-teal-500 h-full rounded-full shadow-[0_0_10px_rgba(52,211,153,0.25)]" style={{ width: `${Math.min((macros.protein.current / macros.protein.goal) * 100, 100)}%` }}></div>
                    </div>
                </div>
                <div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="font-semibold text-slate-600">Gorduras</span>
                        <span className="font-bold text-slate-800">{macros.fat.current}g <span className="text-slate-400 font-normal">/ {macros.fat.goal}g</span></span>
                    </div>
                    <div className="w-full bg-slate-100 theme-athlete:bg-slate-700/50 rounded-full h-2 mt-1.5 overflow-hidden">
                        <div className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full shadow-[0_0_10px_rgba(245,158,11,0.25)]" style={{ width: `${Math.min((macros.fat.current / macros.fat.goal) * 100, 100)}%` }}></div>
                    </div>
                </div>
            </div>
        </InfoCard>
      </div>

        <Modal title="Registrar Novo Peso" isOpen={isWeightModalOpen} onClose={() => setWeightModalOpen(false)}>
            <form onSubmit={handleSaveWeight}>
                <label htmlFor="weight-input" className="block text-sm font-medium text-slate-700 mb-1">Novo Peso (kg)</label>
                <input
                    id="weight-input"
                    type="number"
                    step="0.1"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    className="w-full px-3 py-2 bg-white text-slate-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-green focus:border-brand-green"
                    autoFocus
                />
                <div className="mt-4 flex justify-end gap-3">
                    <button type="button" onClick={() => setWeightModalOpen(false)} className="px-4 py-2 bg-gray-200 text-slate-800 rounded-md hover:bg-gray-300 theme-athlete:bg-slate-700 theme-athlete:text-slate-300 theme-athlete:hover:bg-slate-600">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-brand-green text-white rounded-md hover:bg-brand-green-dark">Salvar</button>
                </div>
            </form>
        </Modal>

        {isMealModalOpen && <LogMealModal onClose={() => setMealModalOpen(false)} onLogMeal={handlers.handleLogMeal} handlers={handlers} userData={userData} dailyPlanToday={todaysPlan} />}
        
        {isWaterReminderModalOpen && <WaterReminderModal onClose={() => setWaterReminderModalOpen(false)} onSave={handleSaveWaterReminders} initialSettings={waterReminders} />}
        
        {isAdjustGoalModalOpen && <AdjustGoalModal 
                                      isOpen={isAdjustGoalModalOpen} 
                                      onClose={() => setAdjustGoalModalOpen(false)} 
                                      onSave={handleSaveNewGoal}
                                      userData={userData}
                                  />}
    </div>
  );
};

export default Dashboard;