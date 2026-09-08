import { TrendLineChart } from "@/components/exposure-trend-line-chart/trend-line-chart.tsx";
import { exposureQueryOptions } from "@/lib/api.ts";
import type { ExposureTypeField } from "@/lib/dto/exposure.ts";
import { buildExposureQuery } from "@/lib/exposure-query-utils.ts";
import { getExposureYAxisRange } from "@/lib/exposure-y-axis.ts";
import type { ExposureUnit } from "@/lib/exposures.ts";
import { useQueries } from "@tanstack/react-query";
import { useDate } from "../date-picker/use-date.ts";
import { useUser } from "../user/user-context.tsx";
import { useView } from "../views/use-view.ts";
import { BaseTrendLineChartCard } from "./base-trend-line-chart-card.tsx";
import { toWeeklyMax } from "./trend-line-chart-utils.ts";

interface Props {
	unit: ExposureUnit;
	userId?: string;
}

export function DustTrendLineChartCard({ unit, userId }: Props) {
	const { date } = useDate();
	const { view } = useView();
	const { user } = useUser();

	const exposure = "dust";

	//TODO: Switch 2500 instead of 25, same for the other ones
	const dustFieldsToQuery: Array<ExposureTypeField> = ["pm1_twa", "pm25_twa", "pm4_twa", "pm10_twa"];

	const queriesEnabled = view !== "day";

	const queryOptions = dustFieldsToQuery.map((field) =>
		exposureQueryOptions({
			exposure,
			query: buildExposureQuery(exposure, view, date, {
				field,
				aggregationFunction: "max",
				granularity: "day",
			}),
			userId: userId ?? user.id,
			enabled: queriesEnabled,
		}),
	);

	const queryResults = useQueries({ queries: queryOptions });

	const maxPm1Data = queryResults[0]?.data?.data ?? [];
	const maxPm4Data = queryResults[1]?.data?.data ?? [];
	const maxPm25Data = queryResults[2]?.data?.data ?? [];
	const maxPm10Data = queryResults[3]?.data?.data ?? [];

	const granularity = view === "week" ? "day" : "week";

	const pm1Data = granularity === "week" ? toWeeklyMax(maxPm1Data) : maxPm1Data;
	const pm4Data = granularity === "week" ? toWeeklyMax(maxPm4Data) : maxPm4Data;
	const pm25Data = granularity === "week" ? toWeeklyMax(maxPm25Data) : maxPm25Data;
	const pm10Data = granularity === "week" ? toWeeklyMax(maxPm10Data) : maxPm10Data;

	const allData = [...pm1Data, ...pm4Data, ...pm25Data, ...pm10Data];

	const { minY, maxY } = getExposureYAxisRange(exposure, allData);

	return (
		<BaseTrendLineChartCard>
			<TrendLineChart
				selectedDate={date}
				granularity={granularity}
				unit={unit}
				minY={minY}
				maxY={maxY}
				series={[
					{
						data: pm1Data,
						exposure,
						exposureField: "pm1_twa",
					},
					{
						data: pm4Data,
						exposure,
						exposureField: "pm4_twa",
					},
					{
						data: pm25Data,
						exposure,
						exposureField: "pm25_twa",
					},
					{
						data: pm10Data,
						exposure,
						exposureField: "pm10_twa",
					},
				]}
			/>
		</BaseTrendLineChartCard>
	);
}
