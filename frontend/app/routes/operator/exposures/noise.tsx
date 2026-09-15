import { NoiseExposureChartSection } from "@/features/exposure-line-chart-card/noise-exposure-chart-section.tsx";
import { ExposureStatisticsSection } from "@/features/statistic-card.tsx";
import { NoiseTrendLineChartCard } from "@/features/trend-line-chart-card/noise-trend-line-chart-card.tsx";
import { getDisplayedExposureValue, useExposureChartData } from "@/hooks/use-exposure-chart-data.ts";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import { type Aggregation, Aggregations } from "@/lib/dto/exposure.ts";
import type { Exposure } from "@/lib/exposures.ts";
import { parseAsStringLiteral, useQueryState } from "nuqs";

export default function Noise() {
	const formatDate = useFormatDate();

	const exposure: Exposure = "noise";
	const parseAsAggregation = parseAsStringLiteral(Aggregations);
	const [aggregation] = useQueryState<Aggregation>("aggregation", parseAsAggregation.withDefault("average"));
	const usePeakAggregation = aggregation === "peak";

	const { view, data, isLoading, isError, threshold, dangerThreshold, averageValue, maxPoint, latestPoint } =
		useExposureChartData(exposure, { usePeakAggregation });

	const showTrendLineChart = view === "month" || view === "week";
	const showNoiseStatistics = view === "day";

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-1 flex-col gap-4">
				<NoiseExposureChartSection />

				{showNoiseStatistics && (
					<ExposureStatisticsSection
						isLoading={isLoading}
						isEmpty={isError || !data?.length}
						averageValue={averageValue}
						maxValue={maxPoint ? getDisplayedExposureValue(maxPoint, usePeakAggregation) : null}
						maxTime={maxPoint?.time ?? null}
						latestValue={latestPoint ? getDisplayedExposureValue(latestPoint, usePeakAggregation) : null}
						warningThreshold={threshold.warning}
						dangerThreshold={dangerThreshold}
						unit="db"
						formatTime={(time) => formatDate(time, "HH:mm")}
					/>
				)}
			</div>
			{showTrendLineChart && <NoiseTrendLineChartCard usePeakAggregation={usePeakAggregation} />}
		</div>
	);
}
