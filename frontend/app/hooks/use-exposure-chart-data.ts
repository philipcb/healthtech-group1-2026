import { useDate } from "@/features/date-picker/use-date.ts";
import { getMaxPointByValue } from "@/features/statistic-card-utils.ts";
import { useUser } from "@/features/user/user-context.tsx";
import { useView } from "@/features/views/use-view.ts";
import { exposureQueryOptions } from "@/lib/api.ts";
import type { ExposureDto } from "@/lib/dto/exposure.ts";
import { buildExposureQuery } from "@/lib/exposure-query-utils.ts";
import type { DustField, Exposure } from "@/lib/exposures.ts";
import { getThreshold } from "@/lib/thresholds.ts";
import { mapExposureDataToTimeBucketStatuses } from "@/lib/time-bucket-utils.ts";
import { computeYAxisRange, DUST_Y_AXIS_STEP, getHourDomain } from "@/lib/utils.ts";
import { useQuery } from "@tanstack/react-query";
import { setHours } from "date-fns";

const EXPOSURE_BASE_MAX_Y: Record<Exposure, number> = {
	dust: 45,
	noise: 150,
	vibration: 450,
};

function getYAxisOptions(exposure: Exposure, usePeakAggregation: boolean) {
	if (exposure === "dust") {
		return { step: DUST_Y_AXIS_STEP, topPadding: DUST_Y_AXIS_STEP };
	}

	if (exposure === "noise" && usePeakAggregation) {
		return { step: 130 };
	}

	return {};
}


export function getDisplayedExposureValue(point: ExposureDto, usePeakAggregation: boolean): number {
	return usePeakAggregation && point.peakValue != null ? point.peakValue : point.value;
}

export function useExposureChartData(
	exposure: Exposure,
	options: {
		userId?: string;
		dustField?: DustField;
		usePeakAggregation?: boolean;
	} = {},
) {
	const { view } = useView();
	const { date } = useDate();
	const { user } = useUser();

	const userId = options.userId ?? user.id;
	const usePeakAggregation = options.usePeakAggregation ?? false;

	const query = buildExposureQuery(exposure, view, date, {
		field: options.dustField,
		usePeakAggregation,
	});

	const {
		data: response,
		isLoading,
		isError,
	} = useQuery(
		exposureQueryOptions({
			exposure,
			query,
			userId,
		}),
	);

	const data = response?.data;
	const hourDomain = response?.hourDomain;

	const threshold = getThreshold(exposure, options.dustField);
	const dangerThreshold = usePeakAggregation ? (threshold.peakDanger ?? threshold.danger) : threshold.danger;

	const getValue = (point: ExposureDto) => getDisplayedExposureValue(point, usePeakAggregation);

	const latestPoint = data?.at(-1) ?? null;
	const maxPoint = data && data.length > 0 ? getMaxPointByValue(data, getValue) : null;
	const averageValue =
		data && data.length > 0 ? data.reduce((sum, point) => sum + getValue(point), 0) / data.length : null;

	const maxValue = maxPoint ? getValue(maxPoint) : 0;
	const baseMaxY = EXPOSURE_BASE_MAX_Y[exposure];
	const maxY =
		maxValue > baseMaxY
			? computeYAxisRange(data ?? [], getYAxisOptions(exposure, usePeakAggregation)).maxY
			: baseMaxY;

	const { minHour, maxHour } = getHourDomain(
		hourDomain,
		data?.map((d) => d.time),
		view,
	);
	const minTime = setHours(date, minHour);
	const maxTime = setHours(date, maxHour);

	const calendarData = mapExposureDataToTimeBucketStatuses(data ?? [], exposure, usePeakAggregation);

	return {
		view,
		date,
		query,
		data,
		hourDomain,
		isLoading,
		isError,
		threshold,
		dangerThreshold,
		latestPoint,
		maxPoint,
		averageValue,
		minY: 0,
		maxY,
		minHour,
		maxHour,
		minTime,
		maxTime,
		calendarData,
	};
}
