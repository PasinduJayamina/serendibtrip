import { useState, useEffect, useCallback } from 'react';

/**
 * useTheme — Dark/Light mode hook with system preference detection
 * 
 * Features:
 * - Detects system `prefers-color-scheme: dark`
 * - Persists user preference in localStorage
 * - Applies `data-theme` attribute to <html> (used by CSS tokens)
 * - Zero layout shift (inline script in index.html handles initial theme)
 * 
 * @returns {{ theme: 'light'|'dark', toggleTheme: () => void, setTheme: (t) => void }}
 */

const STORAGE_KEY = 'serendibtrip-theme';

function getInitialTheme() {
  // Check localStorage first
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;

  // Fall back to system preference
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}

export function useTheme() {
  const [theme, setThemeState] = useState(getInitialTheme);

  // Apply theme to DOM
  const applyTheme = useCallback((newTheme) => {
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  }, []);

  // Set theme explicitly
  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
  }, [applyTheme]);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      applyTheme(next);
      return next;
    });
  }, [applyTheme]);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      // Only follow system if user hasn't set a preference
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        const newTheme = e.matches ? 'dark' : 'light';
        setThemeState(newTheme);
        applyTheme(newTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [applyTheme]);

  // Apply theme on mount
  useEffect(() => {
    applyTheme(theme);
  }, []);

  return { theme, toggleTheme, setTheme };
}
