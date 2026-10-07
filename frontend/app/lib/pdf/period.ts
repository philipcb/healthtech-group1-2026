import { TIMEZONE } from "@/i18n/locale.ts";
import type { TZDate } from "@date-fns/tz";
import { eachMonthOfInterval, endOfMonth, startOfMonth } from "date-fns";

/**
 * What a period export covers - always whole months: from the first day of
 * `startMonth` to the last day of `endMonth`. Any day inside a month stands
 * for that whole month.
 */
export type PdfPeriod = { startMonth: TZDate; endMonth: TZDate };

/** The longest period that can be exported: 5 years. */
export const MAX_PERIOD_MONTHS = 60;

/** First and last moment of the period, for queries that fetch all of it at once. */
export function getPeriodRange({ startMonth, endMonth }: PdfPeriod): { startTime: TZDate; endTime: TZDate } {
	return {
		startTime: startOfMonth(startMonth, { in: TIMEZONE }),
		endTime: endOfMonth(endMonth, { in: TIMEZONE }),
	};
}

/** The first day of every month in the period, in order. */
export function getPeriodMonths(period: PdfPeriod): Array<TZDate> {
	const { startTime, endTime } = getPeriodRange(period);
	return eachMonthOfInterval({ start: startTime, end: endTime }, { in: TIMEZONE });
}

/**
 * The summary's actual reporting period: the whole period, clipped at the end
 * to "today" if it isn't over yet. Shared by PeriodSummaryRenderer and
 * PeriodTrendChartsRenderer so both use exactly the same period boundary.
 */
export function getSummaryPeriod(period: PdfPeriod): { periodStart: TZDate; periodEnd: TZDate } {
	const { startTime, endTime } = getPeriodRange(period);
	const today = TIMEZONE(new Date());
	return { periodStart: startTime, periodEnd: today < endTime ? today : endTime };
}
