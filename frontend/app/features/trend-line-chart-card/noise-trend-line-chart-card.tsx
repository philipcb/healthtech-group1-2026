import { TrendLineChart } from "@/components/exposure-trend-line-chart/trend-line-chart.tsx";
import { useExposureTrendData } from "@/hooks/use-exposure-trend-data.ts";
import { BaseTrendLineChartCard } from "./base-trend-line-chart-card.tsx";

interface Props {
	usePeakAggregation?: boolean;
	userId?: string;
}

export function NoiseTrendLineChartCard({ usePeakAggregation, userId }: Props) {
	const { date, granularity, series, minY, maxY } = useExposureTrendData("noise", { userId, usePeakAggregation });

	return (
		<BaseTrendLineChartCard>
			<TrendLineChart
				selectedDate={date}
				granularity={granularity}
				unit="db" //TODO: Should this always use db?
				minY={minY}
				maxY={maxY}
				series={[
					{
						data: series[0].data,
						exposure: "noise",
					},
				]}
				usePeakDangerThreshold={usePeakAggregation === true}
			/>
		</BaseTrendLineChartCard>
	);
}
