"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type SettingsModalContextType = {
  isOpen: boolean;
  openSettings: (tab?: string) => void;
  closeSettings: () => void;
  initialTab?: string;
};

const SettingsModalContext = createContext<SettingsModalContextType | null>(null);

// Lets any component (Header's account dropdown, /profile/[userId]'s own-
// profile links, a "you haven't set X yet" prompt, etc.) open the Settings
// modal without needing to render it themselves — SettingsModal itself is
// mounted once, in the root layout, and just reads isOpen from here.
export function SettingsModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<string | undefined>(undefined);

  function openSettings(tab?: string) {
    setInitialTab(tab);
    setIsOpen(true);
  }

  function closeSettings() {
    setIsOpen(false);
  }

  return (
    <SettingsModalContext.Provider value={{ isOpen, openSettings, closeSettings, initialTab }}>
      {children}
    </SettingsModalContext.Provider>
  );
}

export function useSettingsModal() {
  const ctx = useContext(SettingsModalContext);
  if (!ctx) throw new Error("useSettingsModal must be used within a SettingsModalProvider");
  return ctx;
}