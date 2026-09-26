/** Data preparation helpers for vector-drawn PDF calendars. */
import { TIMEZONE } from "@/i18n/locale.ts";
import type { DangerLevel } from "@/lib/danger-levels.ts";
import type { TimeBucketStatus } from "@/lib/time-bucket-types.ts";
import type { TZDate } from "@date-fns/tz";
import { eachDayOfInterval, endOfMonth, startOfMonth, endOfWeek, isSameDay, isSameMonth, startOfWeek } from "date-fns";

export type PdfCalendarDay = {
	date: TZDate;
	inMonth: boolean;
	dangerLevel: DangerLevel | null;
};

/**
 * Builds a full calendar grid (including leading/trailing days from adjacent
 * months, so every week row has 7 days) for one month, with each day's
 * danger level looked up from the already-fetched day-granularity data.
 */
export function getCalendarDays(monthDate: TZDate, data: Array<TimeBucketStatus>): Array<PdfCalendarDay> {
	const monthStart = startOfMonth(monthDate, { in: TIMEZONE });
	const monthEnd = endOfMonth(monthDate, { in: TIMEZONE });
	const gridStart = startOfWeek(monthStart, { weekStartsOn: 1, in: TIMEZONE });
	const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1, in: TIMEZONE });

	return eachDayOfInterval({ start: gridStart, end: gridEnd }).map((date) => ({
		date,
		inMonth: isSameMonth(date, monthDate, { in: TIMEZONE }),
		dangerLevel: data.find((d) => isSameDay(d.time, date, { in: TIMEZONE }))?.dangerLevel ?? null,
	}));
}
