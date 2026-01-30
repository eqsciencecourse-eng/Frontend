'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // Always light, but typed as Theme to satisfy interface if we expand later
    const theme: Theme = 'light';

    useEffect(() => {
        // Force light class on html element
        const root = window.document.documentElement;
        root.classList.add('light');
        root.classList.remove('dark');
    }, []);

    const toggleTheme = () => {
        // Do nothing, strictly light mode
        console.log("Theme is locked to Light Mode");
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
