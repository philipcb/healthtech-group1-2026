import type {
	AggregationFunction,
	ExposureOverviewRequestDto,
	TimeGranularity,
} from "@/lib/api/generated/models/index.ts";
import { defaultDustField, type ExposureTypeField } from "@/lib/exposures.ts";
import type { TZDate } from "@date-fns/tz";
import { endOfDay, endOfMonth, endOfWeek, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import type { Exposure } from "./exposures.ts";
import type { View } from "./views.ts";

export function granularityForView(view: View): TimeGranularity {
	switch (view) {
		case "day":
			return "minute";
		case "week":
			return "hour";
		case "month":
			return "day";
	}
}

export function aggregationFor(exposure: Exposure, usePeakAggregation: boolean): AggregationFunction {
	switch (exposure) {
		case "dust":
			return "avg";
		case "noise":
			return usePeakAggregation ? "max" : "avg";
		case "vibration":
			return "sum";
	}
}

export function defaultFieldFor(exposure: Exposure): ExposureTypeField | undefined {
	return exposure === "dust" ? defaultDustField : undefined;
}

export function getStartEnd(
	view: View,
	selectedDay: TZDate,
): {
	startTime: TZDate;
	endTime: TZDate;
} {
	switch (view) {
		case "day":
			return {
				startTime: startOfDay(selectedDay),
				endTime: endOfDay(selectedDay),
			};
		case "week":
			return {
				startTime: startOfWeek(selectedDay, { weekStartsOn: 1 }),
				endTime: endOfWeek(selectedDay, { weekStartsOn: 1 }),
			};
		case "month":
			return {
				startTime: startOfMonth(selectedDay),
				endTime: endOfMonth(selectedDay),
			};
	}
}

export function buildExposureOverviewQuery(
	exposures: Array<Exposure>,
	view: View,
	selectedDate: TZDate,
	options?: {
		usePeakAggregation?: boolean;
		granularity?: TimeGranularity;
	},
): ExposureOverviewRequestDto {
	const { startTime, endTime } = getStartEnd(view, selectedDate);
	// The overview shows hourly data in the day view
	const granularity = options?.granularity ?? (view === "day" ? "hour" : granularityForView(view));

	return Object.fromEntries(
		exposures.map((exposure) => [
			exposure,
			{
				startTime,
				endTime,
				granularity,
				function: aggregationFor(exposure, options?.usePeakAggregation ?? false),
				field: defaultFieldFor(exposure),
			},
		]),
	);
}

export function getSummaryGranularity(exposure: Exposure | null): TimeGranularity {
	return exposure === "vibration" ? "hour" : "minute";
}
