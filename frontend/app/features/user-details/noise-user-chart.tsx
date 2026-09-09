import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useDate } from "@/features/date-picker/use-date.ts";
import NoiseExposureLineChartCard from "@/features/exposure-line-chart-card/noise-exposure-line-chart-card.tsx";
import { ExposureStatisticsSection } from "@/features/statistic-card.tsx";
import { NoiseTrendLineChartCard } from "@/features/trend-line-chart-card/noise-trend-line-chart-card.tsx";
import { ExposureChartCard } from "@/features/user-details/exposure-chart-card.tsx";
import { useView } from "@/features/views/use-view.ts";
import { WeekWidget } from "@/features/week-widget/week-widget.tsx";
import { getDisplayedExposureValue, useExposureChartData } from "@/hooks/use-exposure-chart-data.ts";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import { exposureOverviewQueryOptions } from "@/lib/api.ts";
import { type Aggregation, Aggregations } from "@/lib/dto/exposure.ts";
import type { UserWithStatusDto } from "@/lib/dto/user.ts";
import { buildExposureOverviewQuery } from "@/lib/exposure-query-utils.ts";
import type { Exposure } from "@/lib/exposures.ts";
import { mapOverviewDataToTimeBucketStatuses } from "@/lib/time-bucket-utils.ts";
import { useQuery } from "@tanstack/react-query";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useTranslation } from "react-i18next";

export function NoiseUserChart({ selectedUser }: { selectedUser: UserWithStatusDto }) {
	const { view } = useView();
	const { date } = useDate();
	const { t } = useTranslation();
	const formatDate = useFormatDate();
	const exposure: Exposure = "noise";
	const parseAsAggregation = parseAsStringLiteral(Aggregations);
	const [aggregation, setAggregation] = useQueryState<Aggregation>(
		"aggregation",
		parseAsAggregation.withDefault("average"),
	);
	const usePeakAggregation = aggregation === "peak";

	const {
		data,
		isLoading,
		isError,
		threshold,
		dangerThreshold,
		latestPoint,
		maxPoint,
		averageValue,
		minHour,
		maxHour,
	} = useExposureChartData(exposure, { userId: selectedUser.id, usePeakAggregation });

	const { data: overviewResponse } = useQuery(
		exposureOverviewQueryOptions({
			query: buildExposureOverviewQuery([exposure], view, date),
			userId: selectedUser.id,
		}),
	);

	const showTrendLineChart = view === "month" || view === "week";
	const showNoiseStatistics = view === "day";

	return (
		<div className="flex max-w-4xl flex-col gap-4">
			<Tabs value={aggregation} onValueChange={(value) => setAggregation(value as Aggregation)}>
				<TabsList>
					<TabsTrigger value="average">{t(($) => $.measurement.average)}</TabsTrigger>
					<TabsTrigger value="peak">{t(($) => $.measurement.peak)}</TabsTrigger>
				</TabsList>
			</Tabs>

			<ExposureChartCard
				isLoading={isLoading}
				isError={isError}
				data={data}
				selectedDate={date}
				isExposure={true}
			>
				{view === "week" ? (
					<WeekWidget
						dayStartHour={minHour}
						dayEndHour={maxHour}
						data={mapOverviewDataToTimeBucketStatuses(overviewResponse?.data ?? [])}
					/>
				) : (
					<NoiseExposureLineChartCard userId={selectedUser.id} />
				)}
			</ExposureChartCard>

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

			{showTrendLineChart && <NoiseTrendLineChartCard userId={selectedUser.id} />}
		</div>
	);
}
