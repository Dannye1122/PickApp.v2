import React from 'react';

interface GreenMascotOwlProps {
    className?: string;
    size?: number | string;
    isListening?: boolean;
    isSpeaking?: boolean;
    isActive?: boolean;
    eyeOffset?: { x: number; y: number };
}

export const GreenMascotOwl: React.FC<GreenMascotOwlProps> = ({
    className = '',
    size = '100%',
    isListening = false,
    isSpeaking = false,
    isActive = true,
    eyeOffset = { x: 0, y: 0 }
}) => {
    // Clamping eye offset for SVG coordinates
    const eyeX = Math.max(-3, Math.min(3, eyeOffset.x));
    const eyeY = Math.max(-3, Math.min(3, eyeOffset.y));

    if (!isActive) {
        return (
            <svg
                viewBox="0 0 120 120"
                width={size}
                height={size}
                className={`select-none shrink-0 opacity-60 grayscale transition-all duration-300 ${className}`}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Sleeping Shadow */}
                <ellipse cx="60" cy="108" rx="35" ry="5" fill="#1e293b" />

                {/* Feet */}
                <ellipse cx="46" cy="104" rx="9" ry="5.5" fill="#78350f" />
                <ellipse cx="74" cy="104" rx="9" ry="5.5" fill="#78350f" />

                {/* Main Body (Sleepy Gray-Green) */}
                <path
                    d="M32 30 C32 18, 48 18, 60 25 C72 18, 88 18, 88 30 C88 50, 94 85, 90 98 C88 103, 32 103, 30 98 C26 85, 32 50, 32 30 Z"
                    fill="#334155"
                />

                {/* Belly patch */}
                <path
                    d="M38 60 C38 85, 82 85, 82 60 C82 50, 38 50, 38 60 Z"
                    fill="#475569"
                />

                {/* Belly Feathers / Flecks */}
                <path d="M52 70 Q60 74 68 70" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M54 78 Q60 82 66 78" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" />

                {/* Sleeping Closed Eyes */}
                <path d="M38 50 Q48 58 58 50" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
                <path d="M62 50 Q72 58 82 50" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />

                {/* Sleepy Beak */}
                <path
                    d="M54 53 C54 53, 60 48, 66 53 C66 60, 60 66, 60 66 C60 66, 54 60, 54 53 Z"
                    fill="#b45309"
                />
            </svg>
        );
    }

    return (
        <svg
            viewBox="0 0 120 120"
            width={size}
            height={size}
            className={`select-none shrink-0 transition-transform duration-200 ${className}`}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <defs>
                {/* Body Green Gradient */}
                <linearGradient id="owlBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#78c800" />
                    <stop offset="100%" stopColor="#58a700" />
                </linearGradient>

                {/* Belly Lighter Green Gradient */}
                <linearGradient id="owlBellyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#8ee000" />
                    <stop offset="100%" stopColor="#6eb800" />
                </linearGradient>

                {/* Wing Gradient */}
                <linearGradient id="owlWingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#65b300" />
                    <stop offset="100%" stopColor="#4c8c00" />
                </linearGradient>

                {/* Beak & Feet Orange Gradient */}
                <linearGradient id="owlOrangeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ff9600" />
                    <stop offset="100%" stopColor="#e07b00" />
                </linearGradient>
            </defs>

            {/* Ground Shadow */}
            <ellipse cx="60" cy="110" rx="34" ry="5" fill="#0f172a" opacity="0.4" />

            {/* Feet (Cute Orange Paws) */}
            <g>
                <ellipse cx="45" cy="105" rx="10" ry="6" fill="url(#owlOrangeGrad)" />
                <ellipse cx="75" cy="105" rx="10" ry="6" fill="url(#owlOrangeGrad)" />
            </g>

            {/* Left Wing (Animated flap if speaking or listening) */}
            <g
                style={{
                    transformOrigin: '28px 65px',
                    transform: isSpeaking ? 'rotate(-18deg)' : isListening ? 'rotate(-8deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease-in-out'
                }}
            >
                <path
                    d="M32 50 C20 52, 10 65, 14 82 C16 90, 26 95, 34 85 C37 80, 37 60, 32 50 Z"
                    fill="url(#owlWingGrad)"
                />
            </g>

            {/* Right Wing (Animated flap if speaking or listening) */}
            <g
                style={{
                    transformOrigin: '92px 65px',
                    transform: isSpeaking ? 'rotate(18deg)' : isListening ? 'rotate(8deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease-in-out'
                }}
            >
                <path
                    d="M88 50 C100 52, 110 65, 106 82 C104 90, 94 95, 86 85 C83 80, 83 60, 88 50 Z"
                    fill="url(#owlWingGrad)"
                />
            </g>

            {/* Main Rounded Owl Body (Iconic mascot silhouette with curved crests) */}
            <path
                d="M30 32 C30 16, 47 16, 60 25 C73 16, 90 16, 90 32 C90 55, 96 88, 92 100 C88 106, 32 106, 28 100 C24 88, 30 55, 30 32 Z"
                fill="url(#owlBodyGrad)"
            />

            {/* Belly Patch (Lighter lime green rounded tummy) */}
            <path
                d="M37 58 C37 88, 83 88, 83 58 C83 48, 37 48, 37 58 Z"
                fill="url(#owlBellyGrad)"
            />

            {/* Belly Feather Details (Cute chevron/wave tufts) */}
            <path d="M51 72 Q60 77 69 72" stroke="#509600" strokeWidth="3" strokeLinecap="round" />
            <path d="M54 82 Q60 86 66 82" stroke="#509600" strokeWidth="3" strokeLinecap="round" />

            {/* Big Round White Sclera Eyes */}
            <g>
                <circle cx="44" cy="46" r="14.5" fill="#ffffff" />
                <circle cx="76" cy="46" r="14.5" fill="#ffffff" />
            </g>

            {/* Pupils (Interactive Gaze following cursor/touch) */}
            <g>
                {/* Left Pupil */}
                <circle cx={44 + eyeX * 1.5} cy={46 + eyeY * 1.5} r="8.5" fill="#1b2e04" />
                {/* Left Pupil Sparkle Highlights */}
                <circle cx={42 + eyeX * 1.5} cy={43 + eyeY * 1.5} r="3.2" fill="#ffffff" />
                <circle cx={47 + eyeX * 1.5} cy={48 + eyeY * 1.5} r="1.4" fill="#ffffff" />

                {/* Right Pupil */}
                <circle cx={76 + eyeX * 1.5} cy={46 + eyeY * 1.5} r="8.5" fill="#1b2e04" />
                {/* Right Pupil Sparkle Highlights */}
                <circle cx={74 + eyeX * 1.5} cy={43 + eyeY * 1.5} r="3.2" fill="#ffffff" />
                <circle cx={79 + eyeX * 1.5} cy={48 + eyeY * 1.5} r="1.4" fill="#ffffff" />
            </g>

            {/* Cheerful Orange Beak */}
            {isSpeaking ? (
                // Open Happy Beak when talking / hooting
                <g>
                    <path
                        d="M52 52 C52 52, 60 48, 68 52 C68 62, 60 70, 60 70 C60 70, 52 62, 52 52 Z"
                        fill="url(#owlOrangeGrad)"
                    />
                    <path
                        d="M54 56 C56 61, 64 61, 66 56 C65 62, 55 62, 54 56 Z"
                        fill="#7c2d12"
                    />
                    <ellipse cx="60" cy="59" rx="3.5" ry="2" fill="#ef4444" />
                </g>
            ) : (
                // Standard Cute Diamond Beak
                <path
                    d="M53 52 C53 52, 60 47, 67 52 C67 60, 60 67, 60 67 C60 67, 53 60, 53 52 Z"
                    fill="url(#owlOrangeGrad)"
                />
            )}

            {/* Cute Cheeks Blushing */}
            <circle cx="31" cy="54" r="3.5" fill="#ff4b4b" opacity="0.35" />
            <circle cx="89" cy="54" r="3.5" fill="#ff4b4b" opacity="0.35" />
        </svg>
    );
};
