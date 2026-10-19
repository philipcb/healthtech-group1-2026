import { useDate } from "@/features/date-picker/use-date.ts";
import { getMaxPointByValue } from "@/features/statistic-card-utils.ts";
import { useUser } from "@/features/user/user-context.tsx";
import { useView } from "@/features/views/use-view.ts";
import { useGetExposureData } from "@/lib/api/generated/exposure-data.ts";
import type { ExposureDataDto } from "@/lib/api/generated/models/index.ts";
import { getStartEnd } from "@/lib/date.ts";
import { getHourDomain } from "@/lib/exposure-time-domain.ts";
import { getExposureYAxisRange } from "@/lib/exposure-y-axis.ts";
import { aggregationFor, type DustField, defaultDustField, type Exposure } from "@/lib/exposures.ts";
import { getThreshold } from "@/lib/thresholds.ts";
import { mapExposureDataToTimeBucketStatuses } from "@/lib/time-bucket-utils.ts";
import { granularityByView } from "@/lib/views.ts";
import { setHours } from "date-fns";

export function getDisplayedExposureValue(point: ExposureDataDto, usePeakAggregation: boolean): number {
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

	const query = {
		...getStartEnd(view, date),
		granularity: granularityByView[view],
		function: aggregationFor(exposure, usePeakAggregation),
		field: options.dustField ?? (exposure === "dust" ? defaultDustField : undefined),
	};

	const { data: response, isLoading, isError } = useGetExposureData(exposure, userId, query);

	const data = response?.data;
	const hourDomain = response?.hourDomain;

	const threshold = getThreshold(exposure, options.dustField);
	const dangerThreshold = usePeakAggregation ? (threshold.peakDanger ?? threshold.danger) : threshold.danger;

	const getValue = (point: ExposureDataDto) => getDisplayedExposureValue(point, usePeakAggregation);

	const latestPoint = data?.at(-1) ?? null;
	const maxPoint = data && data.length > 0 ? getMaxPointByValue(data, getValue) : null;
	const averageValue =
		data && data.length > 0 ? data.reduce((sum, point) => sum + getValue(point), 0) / data.length : null;

	const { minY, maxY } = getExposureYAxisRange(exposure, data ?? [], { usePeakAggregation });

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
		minY,
		maxY,
		minHour,
		maxHour,
		minTime,
		maxTime,
		calendarData,
	};
}
