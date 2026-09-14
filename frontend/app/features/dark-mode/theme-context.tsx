import { createContext } from "react";

export type Theme = "dark" | "light" | "system";

export type ThemeContextValue = {
	theme: Theme;
	setTheme: (theme: Theme) => void;
};

export const ThemeProviderContext = createContext<ThemeContextValue | undefined>(undefined);
