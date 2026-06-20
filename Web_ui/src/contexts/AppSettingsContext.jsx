import { createContext, useContext } from "react";

export const AppSettingsContext = createContext(null);

export function AppSettingsProvider({ value, children }) {
  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  return useContext(AppSettingsContext);
}
