import { useEffect, useState } from 'react';

type TokenProvider = {
  token: string | null;
  setToken?: (t: string | null) => void;
  logout?: () => void;
};

export function useAuth(): TokenProvider {
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem('access_token') ||
    localStorage.getItem('access_token') ||
    null
  );

  // Keep token in sync with storage changes (e.g., login/logout in other tabs)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'access_token') {
        setToken(
          sessionStorage.getItem('access_token') ||
          localStorage.getItem('access_token') ||
          null
        );
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const logout = () => {
    try {
      sessionStorage.removeItem('access_token');
      localStorage.removeItem('access_token');
    } finally {
      setToken(null);
    }
  };

  return { token, setToken, logout };
}
