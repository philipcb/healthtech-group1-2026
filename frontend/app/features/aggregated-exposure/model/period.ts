import { i18nInstance, type TranslateFn } from "@/i18n/config.ts";
import { TIMEZONE_NAME } from "@/i18n/locale.ts";
import { today as getToday } from "@/lib/date.ts";
import { TZDate } from "@date-fns/tz";
import { getDaysInMonth } from "date-fns";

/** The periods of the overview, the comparison and the map, which the aggregate API's groups only have for these */
export const aggregatedExposurePeriods = ["month", "year"] as const;
export type AggregatedExposurePeriod = (typeof aggregatedExposurePeriods)[number];

/** The group page's periods, which can also be one day in Norwegian time, with a point per hour */
export const groupPeriods = ["day", ...aggregatedExposurePeriods] as const;
export type GroupPeriod = (typeof groupPeriods)[number];

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

export type PeriodSelection<Period extends GroupPeriod = AggregatedExposurePeriod> = {
	period: Period;
	setPeriod: (period: Period) => void;
	/** The day of the month, one-based. Only used for the day period. */
	day: number;
	setDay: (day: number) => void;
	month: number;
	setMonth: (month: number) => void;
	year: number;
	setYear: (year: number) => void;
};

/** What the period is, whatever page it's from */
type PeriodFields = Pick<PeriodSelection<GroupPeriod>, "period" | "day" | "month" | "year">;

export function getSelectableYears(): Array<number> {
	const currentYear = new Date().getFullYear();
	return Array.from({ length: 5 }, (_, index) => currentYear - index);
}

export function getMonthLabel(month: number, t: TranslateFn) {
	return t(($) => $.aggregatedExposure.months[monthKeys[month]]);
}

/** The day picked when switching to the day period: today in the current month, otherwise the month's last day */
export function getDefaultDay(month: number, year: number) {
	const today = getToday();
	return today.getFullYear() === year && today.getMonth() === month
		? today.getDate()
		: getDaysInMonth(new TZDate(year, month, 1, TIMEZONE_NAME));
}

/** The start of the selected day in Norwegian time */
export function getSelectedDay({ day, month, year }: Pick<PeriodFields, "day" | "month" | "year">) {
	return new TZDate(year, month, day, TIMEZONE_NAME);
}

export function getPeriodLabel(selection: PeriodFields, t: TranslateFn) {
	switch (selection.period) {
		case "day":
			return new Intl.DateTimeFormat(i18nInstance.language === "no" ? "nb-NO" : "en-US", {
				day: "numeric",
				month: "long",
				year: "numeric",
				timeZone: TIMEZONE_NAME,
			}).format(getSelectedDay(selection));
		case "month":
			return `${getMonthLabel(selection.month, t)} ${selection.year}`;
		case "year":
			return selection.year.toString();
	}
}

export function getPeriodState({ period, day, month, year }: PeriodFields) {
	const now = new Date();
	const start =
		period === "day"
			? new Date(year, month, day)
			: period === "month"
				? new Date(year, month, 1)
				: new Date(year, 0, 1);
	const end =
		period === "day"
			? new Date(year, month, day + 1)
			: period === "month"
				? new Date(year, month + 1, 1)
				: new Date(year + 1, 0, 1);

	return now < start ? "notStarted" : now < end ? "inProgress" : "complete";
}

/** The aggregate API's period parameters. It only reads `month` for the month period, zero-based like the frontend's. */
export function toPeriodParams({ period, month, year }: Pick<PeriodSelection, "period" | "month" | "year">) {
	return { period, year, month: period === "month" ? month : undefined };
}

/**
 * The group trend's period parameters. A day is always asked for with a point per hour, and `day` is one-based while
 * `month` stays zero-based.
 */
export function toTrendPeriodParams({ period, day, month, year }: PeriodFields) {
	return period === "day" ? { period, year, month, day, isHourly: true } : toPeriodParams({ period, month, year });
}

/** The period for file names */
export function toPeriodFilenamePart({ period, day, month, year }: PeriodFields) {
	const monthPart = `${year}-${String(month + 1).padStart(2, "0")}`;

	switch (period) {
		case "day":
			return `${monthPart}-${String(day).padStart(2, "0")}`;
		case "month":
			return monthPart;
		case "year":
			return year.toString();
	}
}
