import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface AnimatedNumberProps {
  value: number | string;
  formatter?: (val: number) => string;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  formatter,
  className = '',
  prefix = '',
  suffix = '',
}) => {
  const numericValue = typeof value === 'number' ? value : parseFloat(String(value));
  const isNumeric = !isNaN(numericValue);
  const [displayValue, setDisplayValue] = useState<number | string>(value);
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    if (value !== displayValue) {
      setIsChanging(true);
      const timer = setTimeout(() => {
        setDisplayValue(value);
        setIsChanging(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [value, displayValue]);

  if (!isNumeric) {
    return (
      <span className={`inline-block font-mono tracking-tight tabular-nums transition-all duration-300 ${className}`}>
        {prefix}{String(value)}{suffix}
      </span>
    );
  }

  const formattedOutput = formatter ? formatter(numericValue) : numericValue.toLocaleString();

  return (
    <span className={`inline-flex items-baseline font-mono tracking-tight tabular-nums ${className}`}>
      {prefix && <span className="opacity-80 mr-0.5">{prefix}</span>}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={String(value)}
          initial={{ opacity: 0.6, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0.4, y: 4, scale: 0.98 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className={`inline-block ${isChanging ? 'text-emerald-400' : ''} transition-colors duration-300`}
        >
          {formattedOutput}
        </motion.span>
      </AnimatePresence>
      {suffix && <span className="opacity-80 ml-0.5 text-[0.8em]">{suffix}</span>}
    </span>
  );
};
