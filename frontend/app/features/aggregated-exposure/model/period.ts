import type { TranslateFn } from "@/i18n/config.ts";

export const aggregatedExposurePeriods = ["month", "year"] as const;
export type AggregatedExposurePeriod = (typeof aggregatedExposurePeriods)[number];

export const monthKeys = [
	"january",
	"february",
	"march",
	"april",
	"may",
	"june",
	"july",
	"august",
	"september",
	"october",
	"november",
	"december",
] as const;

export type PeriodSelection = {
	period: AggregatedExposurePeriod;
	setPeriod: (period: AggregatedExposurePeriod) => void;
	month: number;
	setMonth: (month: number) => void;
	year: number;
	setYear: (year: number) => void;
};

export function getSelectableYears(): Array<number> {
	const currentYear = new Date().getFullYear();
	return Array.from({ length: 5 }, (_, index) => currentYear - index);
}

export function getMonthLabel(month: number, t: TranslateFn) {
	return t(($) => $.aggregatedExposure.months[monthKeys[month]]);
}

export function getPeriodLabel(
	{ period, month, year }: Pick<PeriodSelection, "period" | "month" | "year">,
	t: TranslateFn,
) {
	return period === "month" ? `${getMonthLabel(month, t)} ${year}` : year.toString();
}

export function getPeriodState({ period, month, year }: Pick<PeriodSelection, "period" | "month" | "year">) {
	const now = new Date();
	const start = period === "month" ? new Date(year, month, 1) : new Date(year, 0, 1);
	const end = period === "month" ? new Date(year, month + 1, 1) : new Date(year + 1, 0, 1);

	return now < start ? "notStarted" : now < end ? "inProgress" : "complete";
}

/** The aggregate API's period parameters. It only reads `month` for the month period, zero-based like the frontend's. */
export function toPeriodParams({ period, month, year }: Pick<PeriodSelection, "period" | "month" | "year">) {
	return { period, year, month: period === "month" ? month : undefined };
}

/** The period for file names */
export function toPeriodFilenamePart({ period, month, year }: Pick<PeriodSelection, "period" | "month" | "year">) {
	return period === "month" ? `${year}-${String(month + 1).padStart(2, "0")}` : year.toString();
}
