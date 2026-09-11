import { resources } from "@/i18n/config.ts";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

/** The localStorage key i18next's language detector reads/writes (see `i18n/config.ts`). */
export const LANGUAGE_STORAGE_KEY = "i18nextLng";

export type Language = keyof typeof resources;

const DEFAULT_LANGUAGE: Language = "en";

function toLanguage(value: string | undefined): Language {
	return value && value in resources ? (value as Language) : DEFAULT_LANGUAGE;
}

/** The single place that reads and persists the user's language preference. */
export function useLanguagePreference() {
	const { i18n } = useTranslation();

	const language = toLanguage(i18n.language);

	const setLanguage = useCallback(
		(next: Language) => {
			i18n.changeLanguage(next);
			localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
		},
		[i18n],
	);

	return { language, setLanguage };
}
