import {
	buildLiveExposureQueries,
	getLiveExposureWindow,
	type TimeRangeOption,
} from "@/features/live/live-exposure-queries.ts";
import { useQueries } from "@tanstack/react-query";
import { isWithinInterval } from "date-fns";
import { useMemo } from "react";

export function useLiveExposureData(userId: string, timeRange: TimeRangeOption) {
	const liveWindow = getLiveExposureWindow(timeRange);
	const { start, end } = liveWindow;
	const queries = buildLiveExposureQueries(userId, liveWindow);

	const [dustPm1, dustPm25, dustPm10, noise, vibration] = useQueries({
		queries: [queries.dustPm1, queries.dustPm25, queries.dustPm10, queries.noise, queries.vibration],
	});

	// Since vibration is cumulative over the day we have to fetch data from the start of the day and then filter it to the selected time range
	const rawVibrationData = vibration.data?.data;
	const vibrationData = useMemo(
		() => (rawVibrationData ?? []).filter((d) => isWithinInterval(d.time, { start, end })),
		[rawVibrationData, start, end],
	);

	return {
		start,
		end,
		dustTwa1Data: dustPm1.data?.data ?? [],
		dustTwa25Data: dustPm25.data?.data ?? [],
		dustTwa10Data: dustPm10.data?.data ?? [],
		noiseData: noise.data?.data ?? [],
		vibrationData,
	};
}
