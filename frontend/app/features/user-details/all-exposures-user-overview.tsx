import { useDate } from "@/features/date-picker/use-date.ts";
import { DayWidget } from "@/features/day-widget/day-widget.tsx";
import { ExposureChartCard } from "@/features/user-details/exposure-chart-card.tsx";
import { useView } from "@/features/views/use-view.ts";
import { WeekWidget } from "@/features/week-widget/week-widget.tsx";
import { getGetExposureOverviewQueryOptions } from "@/lib/api/generated/exposure-data.ts";
import type { UserWithStatusDto } from "@/lib/api/generated/models/index.ts";
import { getStartEnd } from "@/lib/date.ts";
import { getHourDomain } from "@/lib/exposure-time-domain.ts";
import { aggregationFor, defaultDustField } from "@/lib/exposures.ts";
import { mapOverviewBucketsToChartRows, mapOverviewDataToTimeBucketStatuses } from "@/lib/time-bucket-utils.ts";
import { overviewGranularityByView } from "@/lib/views.ts";
import { useQuery } from "@tanstack/react-query";

export function AllExposuresUserOverview({ selectedUser }: { selectedUser: UserWithStatusDto }) {
	const { view } = useView();
	const { date } = useDate();

	const { startTime, endTime } = getStartEnd(view, date);
	const granularity = overviewGranularityByView[view];

	const {
		data: response,
		isLoading,
		isError,
	} = useQuery(
		getGetExposureOverviewQueryOptions(selectedUser.id, {
			dust: { startTime, endTime, granularity, function: aggregationFor("dust", false), field: defaultDustField },
			noise: { startTime, endTime, granularity, function: aggregationFor("noise", false) },
			vibration: { startTime, endTime, granularity, function: aggregationFor("vibration", false) },
		}),
	);

	const data = response?.data;
	const hourDomain = response?.hourDomain;

	const { minHour, maxHour } = getHourDomain(
		hourDomain,
		data?.map((d) => d.time),
		"week", // The overview never shows linecharts so should always calculate hour domain with week padding
	);

	return (
		<ExposureChartCard isLoading={isLoading} isError={isError} data={data} selectedDate={date}>
			{view === "week" ? (
				<WeekWidget
					dayStartHour={minHour}
					dayEndHour={maxHour}
					data={mapOverviewDataToTimeBucketStatuses(data ?? [])}
				/>
			) : (
				<DayWidget
					data={mapOverviewBucketsToChartRows(data ?? [], 0, 23)}
					startHour={minHour}
					endHour={maxHour}
					buildLink={(exposure, dateQueryParam) => {
						const params = new URLSearchParams();
						params.set("exposure", exposure);

						if (selectedUser?.id) {
							params.set("userId", selectedUser.id);
						}

						params.set("date", dateQueryParam);

						return `?${params.toString()}`;
					}}
				/>
			)}
		</ExposureChartCard>
	);
}
