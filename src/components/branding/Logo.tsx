import React from 'react';
import { motion } from 'motion/react';
import { Zap } from 'lucide-react';
import { ThemeColors } from '../../types';

interface LogoProps {
    theme: ThemeColors;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const Logo: React.FC<LogoProps> = ({ theme, size = 'md', className = '' }) => {
    const dimensions = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-13 h-13'
    };

    const textSizes = {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-lg'
    };

    const zapSizes = {
        sm: 'w-3 h-3 -top-1 -right-1',
        md: 'w-4 h-4 -top-1 -right-1',
        lg: 'w-5 h-5 -top-1 -right-1'
    };

    // Always use the iconic emerald/green branding logo colors and proportional rounded corners
    const gradient = 'from-emerald-400 to-emerald-600';
    const radius = size === 'sm' ? 'rounded-xl' : size === 'md' ? 'rounded-2xl' : 'rounded-3xl';
    const shadow = 'shadow-emerald-500/20';

    return (
        <div className={`relative ${className}`}>
            <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`${dimensions[size]} bg-gradient-to-br ${gradient} ${radius} flex items-center justify-center shadow-lg ${shadow} relative z-10`}
            >
                <div className="absolute inset-0 bg-black/10 rounded-[inherit]" />
                
                {/* Classic "PA" Initials */}
                <span className={`${textSizes[size]} font-black italic text-slate-950 tracking-tighter z-10 select-none leading-none`}>
                    PA
                </span>

                {/* Overlapping Lightning Bolt (Zap) Icon */}
                <motion.div 
                    className={`absolute ${zapSizes[size]} z-20 drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.4)]`}
                    animate={{
                        scale: [1, 1.25, 1],
                        opacity: [0.85, 1, 0.85]
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                >
                    <Zap className="w-full h-full text-white fill-white" />
                </motion.div>
            </motion.div>
        </div>
    );
};

interface CatchphraseProps {
    theme?: ThemeColors;
    className?: string;
}

export const Catchphrase: React.FC<CatchphraseProps> = ({ theme, className = '' }) => (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
        <h2 className="text-white text-2xl font-black italic tracking-tighter uppercase whitespace-nowrap">
            PickApp <span className={theme?.text || 'text-emerald-400'}>Pro</span>
        </h2>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] whitespace-nowrap">
            Precision Picking • Peak Performance
        </p>
    </div>
);
