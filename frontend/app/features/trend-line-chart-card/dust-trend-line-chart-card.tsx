import { TrendLineChart } from "@/components/exposure-trend-line-chart/trend-line-chart.tsx";
import { useExposureTrendData } from "@/hooks/use-exposure-trend-data.ts";
import type { ExposureUnit } from "@/lib/exposures.ts";
import { BaseTrendLineChartCard } from "./base-trend-line-chart-card.tsx";

interface Props {
	unit: ExposureUnit;
	userId?: string;
}

export function DustTrendLineChartCard({ unit, userId }: Props) {
	//TODO: Switch 2500 instead of 25, same for the other ones
	const { date, granularity, series, minY, maxY } = useExposureTrendData("dust", {
		userId,
		fields: ["pm1_twa", "pm25_twa", "pm4_twa", "pm10_twa"],
		aggregationFunction: "max",
		granularity: "day",
	});

	return (
		<BaseTrendLineChartCard>
			<TrendLineChart
				selectedDate={date}
				granularity={granularity}
				unit={unit}
				minY={minY}
				maxY={maxY}
				series={series.map((serie) => ({
					data: serie.data,
					exposure: "dust",
					exposureField: serie.field,
				}))}
			/>
		</BaseTrendLineChartCard>
	);
}
