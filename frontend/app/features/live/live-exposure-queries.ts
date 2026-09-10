import { exposureQueryOptions } from "@/lib/api.ts";
import { now, toTZDate } from "@/lib/date.ts";
import { buildExposureQuery } from "@/lib/exposure-query-utils.ts";
import type { TZDate } from "@date-fns/tz";
import { addMinutes, startOfDay, startOfMinute } from "date-fns";
import { parseAsStringLiteral } from "nuqs";

export type TimeRangeOption = "30" | "60" | "180" | "480";

export const parseTimeRange = parseAsStringLiteral(["30", "60", "180", "480"]);

const TIME_RANGE_MINUTES: Record<TimeRangeOption, number> = {
	"30": 30,
	"60": 60,
	"180": 180,
	"480": 480,
};

const DUST_LIVE_FIELDS = ["pm1_twa", "pm25_twa", "pm10_twa"] as const;

export function isTimeRangeOption(value: string | null): value is TimeRangeOption {
	return value === "30" || value === "60" || value === "180" || value === "480";
}

export function resolveTimeRange(value: string | null): TimeRangeOption {
	return isTimeRangeOption(value) ? value : "30";
}

export interface LiveExposureWindow {
	userId: string;
	start: TZDate;
	end: TZDate;
	windowMinutes: number;
}

export function getLiveExposureWindow(userId: string, timeRange: TimeRangeOption): LiveExposureWindow {
	const windowMinutes = TIME_RANGE_MINUTES[timeRange];
	const end = startOfMinute(now());
	const start = addMinutes(end, -windowMinutes);

	return { userId, start, end, windowMinutes };
}

export function buildLiveExposureQueries({ userId, start, end, windowMinutes }: LiveExposureWindow) {
	const windowed = { userId, queryKind: "windowed", windowMinutes } as const;

	return [
		...DUST_LIVE_FIELDS.map((field) =>
			exposureQueryOptions({
				exposure: "dust",
				query: buildExposureQuery("dust", "day", end, {
					granularity: "minute",
					aggregationFunction: "avg",
					field,
					startTime: start,
					endTime: end,
				}),
				...windowed,
			}),
		),
		exposureQueryOptions({
			exposure: "noise",
			query: buildExposureQuery("noise", "day", end, {
				granularity: "minute",
				startTime: start,
				endTime: end,
			}),
			...windowed,
		}),
		exposureQueryOptions({
			exposure: "vibration",
			query: buildExposureQuery("vibration", "day", end, {
				granularity: "minute",
				// Vibration is cumulative over the day, so it is fetched from the start of the day and filtered client-side.
				startTime: toTZDate(startOfDay(start)),
				endTime: end,
			}),
			...windowed,
		}),
	];
}
