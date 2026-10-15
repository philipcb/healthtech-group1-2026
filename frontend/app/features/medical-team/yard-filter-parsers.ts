import { TIMEZONE } from "@/i18n/locale.ts";
import { today } from "@/lib/date.ts";
import type { TZDate } from "@date-fns/tz";
import { endOfMonth, endOfYear, startOfMonth, startOfYear } from "date-fns";
import { parseAsString, parseAsStringLiteral } from "nuqs";

export const periods = ["month", "year"] as const;
export type Period = (typeof periods)[number];

/** URL state for the yard overview filters, shared by every component that reads them */
export const yardFilterParsers = {
	hall: parseAsString,
	occupation: parseAsString,
	period: parseAsStringLiteral(periods).withDefault("month"),
};

/** The selected part of the yard and period that every medical team query is filtered by */
export type YardScope = {
	yardId: string;
	/** Null is the entire yard */
	hall: string | null;
	/** Null is every occupation */
	occupation: string | null;
	start: TZDate;
	end: TZDate;
};

/** The page has no date picker yet, so the selected period is always the current calendar month or year */
export function getPeriodRange(period: Period): { start: TZDate; end: TZDate } {
	const date = today();

	if (period === "year") {
		return { start: startOfYear(date, { in: TIMEZONE }), end: endOfYear(date, { in: TIMEZONE }) };
	}

	return { start: startOfMonth(date, { in: TIMEZONE }), end: endOfMonth(date, { in: TIMEZONE }) };
}
