import { TIMEZONE } from "@/i18n/locale.ts";
import type { ExposureDto, GranularityKey } from "@/lib/dto/exposure.ts";
import type { Note } from "@/lib/dto/note.ts";
import type { Exposure } from "@/lib/exposures.ts";
import type { SummaryLevelCounts } from "@/lib/time-bucket-types.ts";
import { calculateSummaryCounts } from "@/lib/time-bucket-utils.ts";
import type { TZDate } from "@date-fns/tz";
import { isSameDay } from "date-fns";

export type RedDayRow = {
	date: TZDate;
	exposure: Exposure;
	averageValue: number;
	zoneMinutes: SummaryLevelCounts;
	note: string | null;
	/** Minute-level series for this day, reused by the appended day report in Phase B. */
	series: Array<ExposureDto>;
};

/**
 * Red days for one exposure in one month.
 *
 * `dayData` is the day-granularity month series already fetched for the calendar.
 * `minuteData` is the same month at summary granularity — ExposureSummary on the
 * same page requests it with an identical query key, so this costs no extra fetch.
 */
export function getRedDays({
	exposure,
	dayData,
	minuteData,
	notes,
	granularity,
}: {
	exposure: Exposure;
	dayData: Array<ExposureDto>;
	minuteData: Array<ExposureDto>;
	notes: Array<Note>;
	granularity: GranularityKey;
}): Array<RedDayRow> {
	return dayData
		.filter((day) => day.dangerLevel === "danger")
		.map((day) => {
			const series = minuteData.filter((point) => isSameDay(point.time, day.time, { in: TIMEZONE }));

			return {
				date: day.time,
				exposure,
				averageValue:
					series.length > 0 ? series.reduce((sum, point) => sum + point.value, 0) / series.length : day.value,
				zoneMinutes: calculateSummaryCounts(series, { exposure, peakAggregation: false, granularity }),
				note: notes.find((note) => isSameDay(note.time, day.time, { in: TIMEZONE }))?.note ?? null,
				series,
			};
		});
}
