
import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { AppSettings } from '../types';

interface SettingsContextType {
  settings: AppSettings | null;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings | null>(() => {
    const cached = localStorage.getItem('appSettings');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch authoritative server settings
    const syncServerSettings = () => {
      fetch('/api/settings/global')
        .then(res => res.json())
        .then(data => {
          if (data && typeof data === 'object') {
            setSettings(prev => {
              const merged = { ...(prev || {}), ...data };
              localStorage.setItem('appSettings', JSON.stringify(merged));
              return merged;
            });
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    };

    syncServerSettings();

    // 2. Real-time Firestore listener for maintenance and system status
    const docRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as AppSettings;
        setSettings(prev => {
          const merged = {
            ...(prev || {}),
            ...data,
            // Keep server-authoritative backgroundUrl and logoUrl
            backgroundUrl: prev?.backgroundUrl !== undefined ? prev.backgroundUrl : '',
            logoUrl: prev?.logoUrl !== undefined ? prev.logoUrl : ''
          };
          localStorage.setItem('appSettings', JSON.stringify(merged));
          return merged;
        });
      }
      setLoading(false);
    }, (err) => {
      console.warn("Settings fetch notice:", err);
      setLoading(false);
    });

    const handleSettingsUpdated = (e: any) => {
      const data = e?.detail;
      if (data) {
        setSettings(prev => {
          const merged = { ...(prev || {}), ...data };
          localStorage.setItem('appSettings', JSON.stringify(merged));
          return merged;
        });
      }
    };
    window.addEventListener('app-settings-updated', handleSettingsUpdated);

    return () => {
      unsubscribe();
      window.removeEventListener('app-settings-updated', handleSettingsUpdated);
    };
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
};
