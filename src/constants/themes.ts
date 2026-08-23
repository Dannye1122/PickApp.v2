import { ThemeColors } from "../types";

export const THEMES: Record<string, ThemeColors> = {
    "AMBIENT": {
        gradient: "from-emerald-400 to-emerald-600",
        shadow: "shadow-emerald-500/20",
        text: "text-emerald-400",
        textLight: "text-emerald-300",
        bg: "bg-emerald-600",
        bgHover: "hover:bg-emerald-500",
        borderFocus: "focus:border-emerald-400",
        borderFocusLarge: "focus:border-emerald-500",
        radius: "rounded-3xl",
        font: "font-sans",
        panel: "bg-slate-900 border-slate-800"
    },
    "CHILLER": {
        gradient: "from-sky-400 to-sky-600",
        shadow: "shadow-sky-500/20",
        text: "text-sky-400",
        textLight: "text-sky-300",
        bg: "bg-sky-600",
        bgHover: "hover:bg-sky-500",
        borderFocus: "focus:border-sky-400",
        borderFocusLarge: "focus:border-sky-500",
        radius: "rounded-3xl",
        font: "font-sans",
        panel: "bg-slate-900 border-slate-800"
    },
    "FREEZER": {
        gradient: "from-indigo-400 to-indigo-600",
        shadow: "shadow-indigo-500/20",
        text: "text-indigo-400",
        textLight: "text-indigo-300",
        bg: "bg-indigo-600",
        bgHover: "hover:bg-indigo-500",
        borderFocus: "focus:border-indigo-400",
        borderFocusLarge: "focus:border-indigo-500",
        radius: "rounded-3xl",
        font: "font-sans",
        panel: "bg-slate-900 border-slate-800"
    },
    "GOLD": {
        gradient: "from-amber-300 via-yellow-400 to-amber-600",
        shadow: "shadow-amber-500/40",
        text: "text-amber-400",
        textLight: "text-amber-200",
        bg: "bg-amber-500",
        bgHover: "hover:bg-amber-400",
        borderFocus: "focus:border-amber-400",
        borderFocusLarge: "focus:border-amber-500",
        radius: "rounded-[40px]",
        font: "font-sans",
        panel: "bg-slate-900/90 border-amber-500/20 backdrop-blur-xl"
    },
    "CYBER": {
        gradient: "from-cyan-400 via-blue-500 to-purple-600",
        shadow: "shadow-cyan-500/40",
        text: "text-cyan-400",
        textLight: "text-cyan-200",
        bg: "bg-cyan-500",
        bgHover: "hover:bg-cyan-400",
        borderFocus: "focus:border-cyan-400",
        borderFocusLarge: "focus:border-cyan-500",
        radius: "rounded-none",
        font: "font-mono font-bold",
        panel: "bg-black border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.1)]"
    },
    "RUBY": {
        gradient: "from-rose-500 to-red-800",
        shadow: "shadow-rose-600/30",
        text: "text-rose-500",
        textLight: "text-rose-200",
        bg: "bg-rose-600",
        bgHover: "hover:bg-rose-500",
        borderFocus: "focus:border-rose-400",
        borderFocusLarge: "focus:border-rose-500",
        radius: "rounded-2xl",
        font: "font-sans font-black tracking-tight",
        panel: "bg-slate-900 border-rose-900/30"
    },
    "MIDNIGHT": {
        gradient: "from-slate-700 to-slate-900",
        shadow: "shadow-slate-900/50",
        text: "text-slate-300",
        textLight: "text-white",
        bg: "bg-slate-800",
        bgHover: "hover:bg-slate-700",
        borderFocus: "focus:border-slate-400",
        borderFocusLarge: "focus:border-white",
        radius: "rounded-[32px]",
        font: "font-sans tracking-wide",
        panel: "bg-slate-950 border-white/5"
    }
};

export const SKIN_REQUIREMENTS: Record<string, { level: number, name: string, desc: string }> = {
    "GOLD": { level: 10, name: "Gold Standard", desc: "Unlock at Level 10" },
    "CYBER": { level: 5, name: "Neon Cyber", desc: "Unlock at Level 5" },
    "RUBY": { level: 15, name: "Ruby Elite", desc: "Unlock at Level 15" },
    "MIDNIGHT": { level: 1, name: "Midnight Stealth", desc: "Starter Premium Skin" }
};
