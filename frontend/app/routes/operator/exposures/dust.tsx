import { DustExposureChartSection } from "@/features/exposure-line-chart-card/dust-exposure-chart-section.tsx";
import { ExposureStatisticsSection } from "@/features/statistic-card.tsx";
import { DustTrendLineChartCard } from "@/features/trend-line-chart-card/dust-trend-line-chart-card.tsx";
import { useExposureChartData } from "@/hooks/use-exposure-chart-data.ts";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import {
	type DustField,
	defaultDustField,
	type Exposure,
	parseAsDustField,
	parseAsExposureUnit,
} from "@/lib/exposures.ts";
import { useQueryState } from "nuqs";

export default function Dust() {
	const formatDate = useFormatDate();

	const [dustField] = useQueryState<DustField>("dustField", parseAsDustField.withDefault(defaultDustField));
	const [dustUnit] = useQueryState("unit", parseAsExposureUnit.withDefault("ug"));

	const exposure: Exposure = "dust";

	const { view, data, isLoading, isError, threshold, averageValue, maxPoint, latestPoint } = useExposureChartData(
		exposure,
		{ dustField },
	);

	const showTrendLineChart = view === "month" || view === "week";
	const showDustStatistics = view === "day";

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-1 flex-col gap-4">
				<DustExposureChartSection />

				{showDustStatistics && (
					<ExposureStatisticsSection
						isLoading={isLoading}
						isEmpty={isError || data?.length === 0}
						averageValue={averageValue}
						maxValue={maxPoint?.value ?? null}
						maxTime={maxPoint?.time ?? null}
						latestValue={latestPoint?.value ?? null}
						warningThreshold={threshold.warning}
						dangerThreshold={threshold.danger}
						unit={dustUnit}
						formatTime={(time) => formatDate(time, "HH:mm")}
					/>
				)}
			</div>
			{showTrendLineChart && <DustTrendLineChartCard unit={dustUnit} breakoutOnMobile={true} />}
		</div>
	);
}
