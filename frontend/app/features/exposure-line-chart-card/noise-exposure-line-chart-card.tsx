import { ExportButton } from "@/components/export-button.tsx";
import { ThresholdLine } from "@/components/exposure-line-chart/threshold-line.tsx";
import {
	BaseExposureLineChartCard,
	ExposureLineChartCardSkeleton,
} from "@/features/exposure-line-chart-card/base-exposure-line-chart-card.tsx";
import { useUser } from "@/features/user/user-context.tsx";
import { useExportPDF } from "@/hooks/use-export-pdf.ts";
import { useExposureChartData } from "@/hooks/use-exposure-chart-data.ts";
import { type Aggregation, Aggregations } from "@/lib/dto/exposure.ts";
import type { Exposure } from "@/lib/exposures.ts";
import { downsampleExposureData } from "@/lib/utils.ts";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { ExposureGraphEmptyState } from "../statistic-card.tsx";

interface Props {
	userId?: string;
}

export default function NoiseExposureLineChartCard({ userId }: Props) {
	const { t, i18n } = useTranslation();

	const { user } = useUser();
	const { exportToPDF } = useExportPDF();
	const chartContainerId = useId();

	const exposure: Exposure = "noise";
	const parseAsAggregation = parseAsStringLiteral(Aggregations);
	const [aggregation] = useQueryState<Aggregation>("aggregation", parseAsAggregation.withDefault("average"));
	const usePeakAggregation = aggregation === "peak";

	const { date, data, isLoading, threshold, dangerThreshold, minY, maxY, minTime, maxTime } = useExposureChartData(
		exposure,
		{
			userId,
			usePeakAggregation,
		},
	);

	if (isLoading) {
		return <ExposureLineChartCardSkeleton />;
	}

	if (!data || data.length === 0) {
		return <ExposureGraphEmptyState date={date} locale={i18n.language} />;
	}

	return (
		<BaseExposureLineChartCard
			minTime={minTime}
			maxTime={maxTime}
			chartData={downsampleExposureData(exposure, data ?? [])}
			unit="db"
			maxY={maxY}
			minY={minY}
			exposure={exposure}
			usePeakData={usePeakAggregation}
			id={chartContainerId}
			headerRight={
				<ExportButton
					title={t(($) => $.common.exportAsPdf)}
					onClick={() =>
						exportToPDF(
							chartContainerId,
							`${date.toLocaleDateString(i18n.language, {
								day: "numeric",
								month: "long",
								year: "numeric",
							})}-${user.name}-Noise-Exposure-Overview`,
							`${t(($) => $.pdf.noiseExposure)} - ${user.name} - ${date.toLocaleDateString(i18n.language)}`,
						)
					}
				/>
			}
		>
			<ThresholdLine y={dangerThreshold} dangerLevel="danger" />
			{!usePeakAggregation && <ThresholdLine y={threshold.warning} dangerLevel="warning" />}
		</BaseExposureLineChartCard>
	);
}
