import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { CalendarWidget } from "@/features/calendar-widget/calendar-widget.tsx";
import { ExposureLineChartCardSkeleton } from "@/features/exposure-line-chart-card/base-exposure-line-chart-card.tsx";
import NoiseExposureLineChartCard from "@/features/exposure-line-chart-card/noise-exposure-line-chart-card.tsx";
import { ExposureGraphEmptyState, ExposureStatisticsSection } from "@/features/statistic-card.tsx";
import { NoiseTrendLineChartCard } from "@/features/trend-line-chart-card/noise-trend-line-chart-card.tsx";
import { WeekWidget } from "@/features/week-widget/week-widget.tsx";
import { getDisplayedExposureValue, useExposureChartData } from "@/hooks/use-exposure-chart-data.ts";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import { type Aggregation, Aggregations } from "@/lib/dto/exposure.ts";
import type { Exposure } from "@/lib/exposures.ts";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useTranslation } from "react-i18next";

export default function Noise() {
	const { t, i18n } = useTranslation();
	const formatDate = useFormatDate();

	const exposure: Exposure = "noise";
	const parseAsAggregation = parseAsStringLiteral(Aggregations);
	const [aggregation, setAggregation] = useQueryState<Aggregation>(
		"aggregation",
		parseAsAggregation.withDefault("average"),
	);
	const usePeakAggregation = aggregation === "peak";

	const {
		view,
		date,
		data,
		isLoading,
		isError,
		threshold,
		dangerThreshold,
		averageValue,
		maxPoint,
		latestPoint,
		calendarData,
		minHour,
		maxHour,
	} = useExposureChartData(exposure, { usePeakAggregation });

	const showTrendLineChart = view === "month" || view === "week";
	const showNoiseStatistics = view === "day";

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-1 flex-col gap-4">
				<Tabs value={aggregation} onValueChange={(value) => setAggregation(value as Aggregation)}>
					<TabsList>
						<TabsTrigger value="average">{t(($) => $.measurement.average)}</TabsTrigger>
						<TabsTrigger value="peak">{t(($) => $.measurement.peak)}</TabsTrigger>
					</TabsList>
				</Tabs>

				{isLoading ? (
					<ExposureLineChartCardSkeleton />
				) : isError ? (
					<ExposureGraphEmptyState date={date} locale={i18n.language} />
				) : view === "month" ? (
					<CalendarWidget selectedDay={date} data={calendarData} />
				) : view === "week" ? (
					<WeekWidget dayStartHour={minHour} dayEndHour={maxHour} data={calendarData} />
				) : !data || data.length === 0 ? (
					<ExposureGraphEmptyState date={date} locale={i18n.language} />
				) : (
					<NoiseExposureLineChartCard />
				)}

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
