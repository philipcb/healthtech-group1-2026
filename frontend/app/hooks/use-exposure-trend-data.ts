import { useDate } from "@/features/date-picker/use-date.ts";
import { toWeeklyMax } from "@/features/trend-line-chart-card/trend-line-chart-utils.ts";
import { useUser } from "@/features/user/user-context.tsx";
import { useView } from "@/features/views/use-view.ts";
import { exposureQueryOptions } from "@/lib/api.ts";
import type { AggregateFnKey, ExposureDto, ExposureTypeField, GranularityKey } from "@/lib/dto/exposure.ts";
import { buildExposureQuery } from "@/lib/exposure-query-utils.ts";
import { getExposureYAxisRange } from "@/lib/exposure-y-axis.ts";
import type { Exposure } from "@/lib/exposures.ts";
import { useQueries } from "@tanstack/react-query";

export interface ExposureTrendSeries {
	field: ExposureTypeField | undefined;
	data: Array<ExposureDto>;
}

export function useExposureTrendData(
	exposure: Exposure,
	options: {
		userId?: string;
		usePeakAggregation?: boolean;
		fields?: Array<ExposureTypeField>;
		aggregationFunction?: AggregateFnKey;
		granularity?: GranularityKey;
	} = {},
) {
	const { view } = useView();
	const { date } = useDate();
	const { user } = useUser();

	const userId = options.userId ?? user.id;
	const usePeakAggregation = options.usePeakAggregation ?? false;
	const fields = options.fields ?? [undefined];

	const granularity: "day" | "week" = view === "week" ? "day" : "week";

	const queryResults = useQueries({
		queries: fields.map((field) =>
			exposureQueryOptions({
				exposure,
				query: buildExposureQuery(exposure, view, date, {
					field,
					usePeakAggregation,
					aggregationFunction: options.aggregationFunction,
					granularity: options.granularity,
				}),
				userId,
				enabled: view !== "day",
			}),
		),
	});

	const series: Array<ExposureTrendSeries> = fields.map((field, index) => {
		const rawData = queryResults[index]?.data?.data ?? [];
		const normalizedData = usePeakAggregation
			? rawData.map((point) => ({ ...point, value: point.peakValue ?? point.value }))
			: rawData;
		const data = granularity === "week" ? toWeeklyMax(normalizedData) : normalizedData;

		return { field, data };
	});

	const { minY, maxY } = getExposureYAxisRange(
		exposure,
		series.flatMap((s) => s.data),
		{ usePeakAggregation },
	);

	return { view, date, granularity, series, minY, maxY };
}
