import {
	buildLiveExposureQueries,
	getLiveExposureWindow,
	type TimeRangeOption,
} from "@/features/live/live-exposure-queries.ts";
import { useQueries } from "@tanstack/react-query";
import { isWithinInterval } from "date-fns";
import { useMemo } from "react";


export function useLiveExposureData(userId: string, timeRange: TimeRangeOption) {
	const liveWindow = getLiveExposureWindow(userId, timeRange);
	const { start, end } = liveWindow;

	const [dustTwa1Result, dustTwa25Result, dustTwa10Result, noiseResult, vibrationResult] = useQueries({
		queries: buildLiveExposureQueries(liveWindow),
	});

	const dustTwa1Data = dustTwa1Result.data?.data ?? [];
	const dustTwa25Data = dustTwa25Result.data?.data ?? [];
	const dustTwa10Data = dustTwa10Result.data?.data ?? [];
	const noiseData = noiseResult.data?.data ?? [];
	const rawVibrationData = vibrationResult.data?.data ?? [];

	// Since vibration is cumulative over the day we have to fetch data from the start of the day and then filter it to the selected time range
	const vibrationData = useMemo(() => {
		if (!rawVibrationData) {
			return [];
		}

		return rawVibrationData.filter((d) => isWithinInterval(d.time, { start, end }));
	}, [rawVibrationData, start, end]);

	return {
		start,
		end,
		dustTwa1Data,
		dustTwa25Data,
		dustTwa10Data,
		noiseData,
		vibrationData,
	};
}
