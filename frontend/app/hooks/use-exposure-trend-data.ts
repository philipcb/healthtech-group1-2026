import { useDate } from "@/features/date-picker/use-date.ts";
import { toWeeklyMax } from "@/features/trend-line-chart-card/trend-line-chart-utils.ts";
import { useUser } from "@/features/user/user-context.tsx";
import { useView } from "@/features/views/use-view.ts";
import { getGetExposureDataQueryOptions } from "@/lib/api/generated/exposure-data.ts";
import type { AggregationFunction, ExposureDataDto, TimeGranularity } from "@/lib/api/generated/models/index.ts";
import { aggregationFor, defaultFieldFor, getStartEnd, granularityForView } from "@/lib/exposure-query-utils.ts";
import { getExposureYAxisRange } from "@/lib/exposure-y-axis.ts";
import type { Exposure, ExposureTypeField } from "@/lib/exposures.ts";
import { useQueries } from "@tanstack/react-query";

export interface ExposureTrendSeries {
	field: ExposureTypeField | undefined;
	data: Array<ExposureDataDto>;
}

export function useExposureTrendData(
	exposure: Exposure,
	options: {
		userId?: string;
		usePeakAggregation?: boolean;
		fields?: Array<ExposureTypeField>;
		aggregationFunction?: AggregationFunction;
		granularity?: TimeGranularity;
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
			getGetExposureDataQueryOptions(
				exposure,
				userId,
				{
					...getStartEnd(view, date),
					granularity: options.granularity ?? granularityForView(view),
					function: options.aggregationFunction ?? aggregationFor(exposure, usePeakAggregation),
					field: field ?? defaultFieldFor(exposure),
				},
				{ query: { enabled: view !== "day" } },
			),
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
