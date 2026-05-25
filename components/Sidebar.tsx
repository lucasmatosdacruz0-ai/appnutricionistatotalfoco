import React from 'react';
import { UserData, View, UserDataHandlers } from '../types';
import { BowlIcon } from './icons/BowlIcon';
import { NAV_ITEMS } from '../constants';

interface SidebarProps {
  activeView: View;
  setActiveView: (view: View) => void;
  userData: UserData;
  handlers: UserDataHandlers;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, userData, handlers }) => {

  return (
    <aside className="w-64 h-full bg-white/70 backdrop-blur-md hidden md:flex flex-col p-6 border-r border-gray-200 theme-athlete:bg-slate-900/70 theme-athlete:backdrop-blur-md theme-athlete:border-slate-700 theme-dark:bg-slate-900/70 theme-dark:backdrop-blur-md theme-dark:border-slate-800">
      <div className="flex items-center gap-3 mb-10">
        <div className="bg-brand-green p-2 rounded-full">
          <BowlIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-slate-900">NutriBot Pro</h1>
          <p className="text-sm text-slate-500">IA Nutricionista</p>
        </div>
      </div>

      <nav id="sidebar-nav" className="flex flex-col gap-2 flex-1">
        {NAV_ITEMS.map((item) => {
          const isFocoTotal = item.name === 'Foco Total';
          const isActive = activeView === item.name;

          let colorClasses = '';

          if (isFocoTotal) {
            if (isActive) {
              colorClasses = 'bg-brand-blue text-white border-l-4 border-brand-blue-dark';
            } else {
              colorClasses = 'text-brand-blue hover:bg-brand-blue-light';
            }
          } else {
            if (isActive) {
              colorClasses = 'bg-brand-green-light text-brand-green-dark border-l-4 border-brand-green';
            } else {
              colorClasses = 'text-slate-600 hover:bg-gray-100';
            }
          }
          
          return (
            <button
              key={item.name}
              onClick={() => setActiveView(item.name)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-md font-medium transition-colors duration-200 ${colorClasses}`}
            >
              {item.icon}
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>

      {userData.dietDifficulty !== 'athlete' && (
        <div className="mt-auto pt-4 border-t border-gray-100 theme-dark:border-slate-800">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-sm text-slate-600 theme-dark:text-slate-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <span className="font-semibold text-xs">Modo Escuro</span>
            </div>
            <button 
                type="button"
                onClick={() => handlers.updateUserData({ darkMode: !userData.darkMode })}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${userData.darkMode ? 'bg-indigo-500' : 'bg-gray-300 hover:bg-[#9ca3a3]'}`}
                role="switch"
                aria-checked={userData.darkMode}
            >
                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${userData.darkMode ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      )}

    </aside>
  );
};

export default Sidebar;