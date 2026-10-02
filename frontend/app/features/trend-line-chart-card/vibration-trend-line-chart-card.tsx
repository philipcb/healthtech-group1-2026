import { TrendLineChart } from "@/components/exposure-trend-line-chart/trend-line-chart.tsx";
import { useExposureTrendData } from "@/hooks/use-exposure-trend-data.ts";
import { BaseTrendLineChartCard } from "./base-trend-line-chart-card.tsx";

interface Props {
	userId?: string;
	breakoutOnMobile?: boolean;
}

export function VibrationTrendLineChartCard({ userId, breakoutOnMobile }: Props) {
	const { date, granularity, series, minY, maxY } = useExposureTrendData("vibration", { userId });

	return (
		<BaseTrendLineChartCard breakoutOnMobile={breakoutOnMobile}>
			<TrendLineChart
				selectedDate={date}
				granularity={granularity}
				unit="points"
				minY={minY}
				maxY={maxY}
				series={[
					{
						data: series[0].data,
						exposure: "vibration",
					},
				]}
				breakoutOnMobile={breakoutOnMobile}
			/>
		</BaseTrendLineChartCard>
	);
}
