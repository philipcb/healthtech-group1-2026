import { getGetExposureDataQueryKey, getGetExposureDataQueryOptions } from "@/lib/api/generated/exposure-data.ts";
import type { ExposureDataRequestDto } from "@/lib/api/generated/models/index.ts";
import { now, toTZDate } from "@/lib/date.ts";
import type { DustField, Exposure } from "@/lib/exposures.ts";
import type { TZDate } from "@date-fns/tz";
import { addMinutes, startOfDay, startOfMinute } from "date-fns";
import { parseAsStringLiteral } from "nuqs";

/** The live view's time ranges, in minutes */
const TIME_RANGES = ["30", "60", "180", "480"] as const;

export type TimeRangeOption = (typeof TIME_RANGES)[number];

export const parseTimeRange = parseAsStringLiteral(TIME_RANGES).withDefault("30");

export interface LiveExposureWindow {
	start: TZDate;
	end: TZDate;
	windowMinutes: number;
}

export function getLiveExposureWindow(timeRange: TimeRangeOption): LiveExposureWindow {
	const windowMinutes = Number(timeRange);
	const end = startOfMinute(now());
	const start = addMinutes(end, -windowMinutes);

	return { start, end, windowMinutes };
}

/**
 * The live window moves every minute, so its cache key has the window's length instead of the request's start and end.
 * Every refetch then updates the same cache entry, and the page uses what the route loader prefetched. Otherwise the key
 * has the same shape as the generated one, so the query defaults apply to it.
 */
function liveExposureQueryOptions(
	exposure: Exposure,
	userId: string,
	request: ExposureDataRequestDto,
	windowMinutes: number,
) {
	const { granularity, function: aggregationFunction, field } = request;
	const queryKey = [
		...getGetExposureDataQueryKey(exposure, userId).filter((part) => part !== undefined),
		{ granularity, function: aggregationFunction, field, windowMinutes },
	];

	return getGetExposureDataQueryOptions(exposure, userId, request, { query: { queryKey } });
}

export function buildLiveExposureQueries(userId: string, { start, end, windowMinutes }: LiveExposureWindow) {
	const dust = (field: DustField) =>
		liveExposureQueryOptions(
			"dust",
			userId,
			{ startTime: start, endTime: end, granularity: "minute", function: "avg", field },
			windowMinutes,
		);

	return {
		dustPm1: dust("pm1_twa"),
		dustPm25: dust("pm25_twa"),
		dustPm10: dust("pm10_twa"),
		noise: liveExposureQueryOptions(
			"noise",
			userId,
			{ startTime: start, endTime: end, granularity: "minute", function: "avg" },
			windowMinutes,
		),
		vibration: liveExposureQueryOptions(
			"vibration",
			userId,
			// Vibration is cumulative over the day, so it is fetched from the start of the day and filtered client-side.
			{ startTime: toTZDate(startOfDay(start)), endTime: end, granularity: "minute", function: "sum" },
			windowMinutes,
		),
	};
}
