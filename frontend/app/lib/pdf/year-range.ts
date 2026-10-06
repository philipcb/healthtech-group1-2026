import { TIMEZONE } from "@/i18n/locale.ts";
import type { TZDate } from "@date-fns/tz";
import { endOfYear, startOfYear } from "date-fns";

export function getYearRange(date: TZDate): { startTime: TZDate; endTime: TZDate } {
	return {
		startTime: startOfYear(date, { in: TIMEZONE }),
		endTime: endOfYear(date, { in: TIMEZONE }),
	};
}

/**
 * The year export's actual reporting period: the selected year, clipped at
 * the end to "today" if the year isn't over yet. Shared by YearSummaryRenderer
 * and YearTrendChartsRenderer so both use exactly the same period boundary.
 */
export function getYearSummaryPeriod(selectedDate: TZDate): { periodStart: TZDate; periodEnd: TZDate } {
	const periodStart = startOfYear(selectedDate, { in: TIMEZONE });
	const today = TIMEZONE(new Date());
	const periodEnd =
		today < endOfYear(selectedDate, { in: TIMEZONE }) ? today : endOfYear(selectedDate, { in: TIMEZONE });
	return { periodStart, periodEnd };
}
