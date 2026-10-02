import { ThresholdLine } from "@/components/exposure-line-chart/threshold-line.tsx";
import {
	BaseExposureLineChartCard,
	ExposureLineChartCardSkeleton,
} from "@/features/exposure-line-chart-card/base-exposure-line-chart-card.tsx";
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
	breakoutOnMobile?: boolean;
}

export default function NoiseExposureLineChartCard({ userId, breakoutOnMobile }: Props) {
	const { i18n } = useTranslation();

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
			breakoutOnMobile={breakoutOnMobile}
		>
			<ThresholdLine y={dangerThreshold} dangerLevel="danger" />
			{!usePeakAggregation && <ThresholdLine y={threshold.warning} dangerLevel="warning" />}
		</BaseExposureLineChartCard>
	);
}
