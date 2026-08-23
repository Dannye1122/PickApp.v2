import React from 'react';

interface OwlProps {
    className?: string;
    size?: number | string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    isSpeaking?: boolean;
}

export const Owl: React.FC<OwlProps> = ({
    className = '',
    size = '100%',
    isSpeaking = false,
}) => {
    return (
        <svg
            viewBox="0 0 120 120"
            width={size}
            height={size}
            className={`select-none shrink-0 ${className}`}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                <linearGradient id="brandOwlBody" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#78c800" />
                    <stop offset="100%" stopColor="#58a700" />
                </linearGradient>
                <linearGradient id="brandOwlBelly" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#8ee000" />
                    <stop offset="100%" stopColor="#6eb800" />
                </linearGradient>
                <linearGradient id="brandOwlOrange" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ff9600" />
                    <stop offset="100%" stopColor="#e07b00" />
                </linearGradient>
            </defs>

            {/* Feet */}
            <ellipse cx="45" cy="105" rx="10" ry="6" fill="url(#brandOwlOrange)" />
            <ellipse cx="75" cy="105" rx="10" ry="6" fill="url(#brandOwlOrange)" />

            {/* Wings */}
            <path d="M32 50 C20 52, 10 65, 14 82 C16 90, 26 95, 34 85 C37 80, 37 60, 32 50 Z" fill="#65b300" />
            <path d="M88 50 C100 52, 110 65, 106 82 C104 90, 94 95, 86 85 C83 80, 83 60, 88 50 Z" fill="#65b300" />

            {/* Body */}
            <path
                d="M30 32 C30 16, 47 16, 60 25 C73 16, 90 16, 90 32 C90 55, 96 88, 92 100 C88 106, 32 106, 28 100 C24 88, 30 55, 30 32 Z"
                fill="url(#brandOwlBody)"
            />

            {/* Belly */}
            <path d="M37 58 C37 88, 83 88, 83 58 C83 48, 37 48, 37 58 Z" fill="url(#brandOwlBelly)" />
            <path d="M51 72 Q60 77 69 72" stroke="#509600" strokeWidth="3" strokeLinecap="round" />
            <path d="M54 82 Q60 86 66 82" stroke="#509600" strokeWidth="3" strokeLinecap="round" />

            {/* Eyes */}
            <circle cx="44" cy="46" r="14.5" fill="#ffffff" />
            <circle cx="76" cy="46" r="14.5" fill="#ffffff" />

            {/* Pupils */}
            <circle cx="44" cy="46" r="8.5" fill="#1b2e04" />
            <circle cx="42" cy="43" r="3.2" fill="#ffffff" />
            <circle cx="47" cy="48" r="1.4" fill="#ffffff" />

            <circle cx="76" cy="46" r="8.5" fill="#1b2e04" />
            <circle cx="74" cy="43" r="3.2" fill="#ffffff" />
            <circle cx="79" cy="48" r="1.4" fill="#ffffff" />

            {/* Beak */}
            <path d="M53 52 C53 52, 60 47, 67 52 C67 60, 60 67, 60 67 C60 67, 53 60, 53 52 Z" fill="url(#brandOwlOrange)" />

            {/* Cheeks */}
            <circle cx="31" cy="54" r="3.5" fill="#ff4b4b" opacity="0.35" />
            <circle cx="89" cy="54" r="3.5" fill="#ff4b4b" opacity="0.35" />
        </svg>
    );
};
