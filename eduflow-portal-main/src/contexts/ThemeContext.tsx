import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
  fontSize: number;
  setFontSize: (size: number) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('hadir_dark_mode');
    if (stored !== null) {
      return stored === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [fontSize, setFontSizeState] = useState(() => {
    const stored = localStorage.getItem('hadir_font_size');
    return stored !== null ? Number(stored) : 50;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('hadir_dark_mode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    // Map 0-100 to 12px-20px (where 50 is 16px)
    const mappedSize = 12 + (fontSize / 100) * 8;
    document.documentElement.style.fontSize = `${mappedSize}px`;
    localStorage.setItem('hadir_font_size', String(fontSize));
  }, [fontSize]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);
  const setFontSize = (size: number) => setFontSizeState(size);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, fontSize, setFontSize }}>
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

