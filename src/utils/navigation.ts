import { useState, useEffect } from 'react';

/**
 * Navigate to a specific path using the browser's History API
 * without reloading the entire application.
 */
export function navigateTo(path: string): void {
  if (window.location.pathname !== path) {
    window.history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}

/**
 * React hook that returns the current browser window.location.pathname
 * and re-renders whenever navigation events occur.
 */
export function useCurrentPath(): string {
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', onLocationChange);
    return () => window.removeEventListener('popstate', onLocationChange);
  }, []);

  return currentPath;
}
