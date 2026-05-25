
import React from 'react';

interface InfoCardProps {
  icon: React.ReactNode;
  iconBg: string;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bgClassName?: string;
}

const InfoCard: React.FC<InfoCardProps> = ({ icon, iconBg, rightIcon, children, className = '', bgClassName }) => {
  const defaultBg = "bg-white/80 backdrop-blur-sm border-gray-100";
  const bgClass = bgClassName ? bgClassName : defaultBg;

  return (
    <div className={`${bgClass} p-5 rounded-2xl shadow-sm border flex flex-col relative transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${className}`}>
        <div className="flex justify-between items-start mb-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconBg}`}>
                {icon}
            </div>
            {rightIcon && (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/50 border border-gray-200">
                    {rightIcon}
                </div>
            )}
        </div>
        <div>{children}</div>
    </div>
  );
};

export default InfoCard;
