import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '../types';

interface AuthState {
    isAuthenticated: boolean;
    setIsAuthenticated: (val: boolean) => void;
    username: string;
    setUsername: (val: string) => void;
    password: string;
    setPassword: (val: string) => void;
    loginError: string;
    setLoginError: (val: string) => void;
    userProfile: UserProfile | null;
    setUserProfile: (val: UserProfile | null) => void;
    sessionId: string;
    hasConsented: boolean;
    setHasConsented: (val: boolean) => void;
    firebaseUser: any;
    setFirebaseUser: (val: any) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return sessionStorage.getItem('session_authenticated') === 'true';
    });
    
    const [username, setUsername] = useState(() => {
        return localStorage.getItem('lastUser') || '';
    });
    
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<any>(null);

    const [sessionId] = useState(() => {
        let sid = localStorage.getItem('sessionId');
        if (!sid) {
            sid = crypto.randomUUID();
            localStorage.setItem('sessionId', sid);
        }
        return sid;
    });

    const [hasConsented, setHasConsented] = useState(() => {
        return localStorage.getItem('userConsented') === 'true';
    });

    useEffect(() => {
        if (isAuthenticated) {
            sessionStorage.setItem('session_authenticated', 'true');
        } else {
            sessionStorage.removeItem('session_authenticated');
        }
    }, [isAuthenticated]);

    const value = {
        isAuthenticated, setIsAuthenticated,
        username, setUsername,
        password, setPassword,
        loginError, setLoginError,
        userProfile, setUserProfile,
        sessionId,
        hasConsented, setHasConsented,
        firebaseUser, setFirebaseUser
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
