import { useDate } from "@/features/date-picker/use-date.ts";
import VibrationExposureLineChartCard from "@/features/exposure-line-chart-card/vibration-exposure-line-chart-card.tsx";
import { ExposureStatisticsSection } from "@/features/statistic-card.tsx";
import { VibrationTrendLineChartCard } from "@/features/trend-line-chart-card/vibration-trend-line-chart-card.tsx";
import { ExposureChartCard } from "@/features/user-details/exposure-chart-card.tsx";
import { useView } from "@/features/views/use-view.ts";
import { WeekWidget } from "@/features/week-widget/week-widget.tsx";
import { useExposureChartData } from "@/hooks/use-exposure-chart-data.ts";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import { exposureOverviewQueryOptions } from "@/lib/api.ts";
import type { UserWithStatusDto } from "@/lib/dto/user.ts";
import { buildExposureOverviewQuery } from "@/lib/exposure-query-utils.ts";
import type { Exposure } from "@/lib/exposures.ts";
import { mapOverviewDataToTimeBucketStatuses } from "@/lib/time-bucket-utils.ts";
import { useQuery } from "@tanstack/react-query";

export function VibrationUserChart({ selectedUser }: { selectedUser: UserWithStatusDto }) {
	const { view } = useView();
	const { date } = useDate();
	const formatDate = useFormatDate();
	const exposure: Exposure = "vibration";

	const { data, isLoading, isError, threshold, maxPoint, minHour, maxHour } = useExposureChartData(exposure, {
		userId: selectedUser.id,
	});

	const { data: overviewResponse } = useQuery(
		exposureOverviewQueryOptions({
			query: buildExposureOverviewQuery([exposure], view, date),
			userId: selectedUser.id,
		}),
	);

	const showTrendLineChart = view === "month" || view === "week";
	const showVibrationStatistics = view === "day";

	return (
		<div className="flex flex-col gap-4">
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
					<VibrationExposureLineChartCard userId={selectedUser.id} />
				)}
			</ExposureChartCard>

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

			{showTrendLineChart && <VibrationTrendLineChartCard userId={selectedUser.id} />}
		</div>
	);
}
