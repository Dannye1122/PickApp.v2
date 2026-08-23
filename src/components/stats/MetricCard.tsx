import React from 'react';
import { motion } from 'motion/react';
import { ThemeColors } from '../../types';

interface MetricCardProps {
    label: string;
    value: string | number;
    subValue?: string;
    isGood?: boolean;
    theme: ThemeColors;
    icon?: React.ReactNode;
    className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({ 
    label, value, subValue, isGood, theme, icon, className = '' 
}) => {
    const valueColor = isGood === undefined ? 'text-white' : isGood ? 'text-emerald-400' : 'text-red-400';

    return (
        <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            whileHover={{ scale: 1.03, y: -2 }}
            className={`${theme.panel} p-4 ${theme.radius} border flex flex-col items-center justify-center relative overflow-hidden group shadow-lg cursor-pointer transition-colors duration-200 ${className}`}
        >
            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mb-1 flex items-center gap-1.5">
                {icon}
                {label}
            </div>
            <div className={`text-4xl font-bold tracking-tight ${valueColor}`}>
                {value}
            </div>
            {subValue && (
                <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">
                    {subValue}
                </div>
            )}
        </motion.div>
    );
};
