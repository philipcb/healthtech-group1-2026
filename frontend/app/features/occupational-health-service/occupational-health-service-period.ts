import type { TranslateFn } from "@/i18n/config.ts";

export const occupationalHealthServicePeriods = ["month", "year"] as const;
export type OccupationalHealthServicePeriod = (typeof occupationalHealthServicePeriods)[number];

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
	period: OccupationalHealthServicePeriod;
	setPeriod: (period: OccupationalHealthServicePeriod) => void;
	/** Zero-based month index, as returned by `Date#getMonth` */
	month: number;
	setMonth: (month: number) => void;
	year: number;
	setYear: (year: number) => void;
};

/** The current year and the four before it, newest first */
export function getSelectableYears(): Array<number> {
	const currentYear = new Date().getFullYear();
	return Array.from({ length: 5 }, (_, index) => currentYear - index);
}

export function getMonthLabel(month: number, t: TranslateFn) {
	return t(($) => $.occupationalHealthServiceDashboard.months[monthKeys[month]]);
}

export function getPeriodLabel(
	{ period, month, year }: Pick<PeriodSelection, "period" | "month" | "year">,
	t: TranslateFn,
) {
	return period === "month" ? `${getMonthLabel(month, t)} ${year}` : year.toString();
}
