import { TrendLineChart } from "@/components/exposure-trend-line-chart/trend-line-chart.tsx";
import { useExposureTrendData } from "@/hooks/use-exposure-trend-data.ts";
import { BaseTrendLineChartCard } from "./base-trend-line-chart-card.tsx";

interface Props {
	usePeakAggregation?: boolean;
	userId?: string;
	breakoutOnMobile?: boolean;
}

export function NoiseTrendLineChartCard({ usePeakAggregation, userId, breakoutOnMobile }: Props) {
	const { date, granularity, series, minY, maxY } = useExposureTrendData("noise", { userId, usePeakAggregation });

	return (
		<BaseTrendLineChartCard breakoutOnMobile={breakoutOnMobile}>
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
				breakoutOnMobile={breakoutOnMobile}
			/>
		</BaseTrendLineChartCard>
	);
}
