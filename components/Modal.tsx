import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  headerAction?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', headerAction }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[1000] flex justify-center items-start sm:items-center overflow-y-auto p-4 sm:p-6 animate-fadeIn" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className={`relative bg-white rounded-xl shadow-2xl w-full ${sizeClasses[size]} my-auto max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden theme-athlete:bg-slate-800 theme-athlete:border theme-athlete:border-slate-700`} onClick={e => e.stopPropagation()}>
        <div className="p-4 sm:p-5 border-b border-gray-200 flex justify-between items-start gap-4 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h3 id="modal-title" className="text-base sm:text-lg font-bold text-slate-800 break-words leading-snug">{title}</h3>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {headerAction}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-full hover:bg-slate-100 cursor-pointer" aria-label="Fechar modal">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-4 sm:p-5 pb-16 sm:pb-8 overflow-y-auto flex-1 min-h-0">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;