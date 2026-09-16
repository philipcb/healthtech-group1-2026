import { VibrationExposureChartSection } from "@/features/exposure-line-chart-card/vibration-exposure-chart-section.tsx";
import { ExposureStatisticsSection } from "@/features/statistic-card.tsx";
import { VibrationTrendLineChartCard } from "@/features/trend-line-chart-card/vibration-trend-line-chart-card.tsx";
import { useExposureChartData } from "@/hooks/use-exposure-chart-data.ts";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import type { Exposure } from "@/lib/exposures.ts";

export default function Vibration() {
	const formatDate = useFormatDate();

	const exposure: Exposure = "vibration";

	const { view, data, isLoading, isError, threshold, maxPoint } = useExposureChartData(exposure);

	const showTrendLineChart = view === "month" || view === "week";
	const showVibrationStatistics = view === "day";

	return (
		<div className="flex flex-col gap-8">
			<div className="flex h-full w-full flex-col-reverse gap-4 md:flex-row">
				<div className="flex flex-1 flex-col gap-4">
					<VibrationExposureChartSection />

					{showVibrationStatistics && (
						<ExposureStatisticsSection
							isLoading={isLoading}
							isEmpty={isError || !data?.length}
							averageValue={null}
							maxValue={maxPoint?.value ?? null}
							maxTime={null}
							latestValue={null}
							warningThreshold={threshold.warning}
							dangerThreshold={threshold.danger}
							unit="points"
							formatTime={(time) => formatDate(time, "HH:mm")}
						/>
					)}
				</div>
			</div>
			{showTrendLineChart && <VibrationTrendLineChartCard />}
		</div>
	);
}
