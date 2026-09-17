import { Card } from "@/components/ui/card.tsx";
import { CalendarWidget } from "@/features/calendar-widget/calendar-widget.tsx";
import { useDate } from "@/features/date-picker/use-date.ts";
import { DayWidget } from "@/features/day-widget/day-widget.tsx";
import { ExposureGraphEmptyState } from "@/features/statistic-card.tsx";
import { useUser } from "@/features/user/user-context.tsx";
import { useView } from "@/features/views/use-view.ts";
import { WeekWidget } from "@/features/week-widget/week-widget.tsx";
import { exposureOverviewQueryOptions } from "@/lib/api.ts";
import { buildExposureOverviewQuery } from "@/lib/exposure-query-utils.ts";
import { exposures } from "@/lib/exposures.ts";
import { mapOverviewBucketsToChartRows, mapOverviewDataToTimeBucketStatuses } from "@/lib/time-bucket-utils.ts";
import { getHourDomain } from "@/lib/utils.ts";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

export default function OperatorHome() {
	const { t, i18n } = useTranslation();

	const { view } = useView();
	const { date } = useDate();

	const { user } = useUser();

	// NOTE: If we later add a peak noise switch here it wouldn't work because we don't return peakDangerLevel in the overview query.
	const {
		data: response,
		isLoading,
		isError,
	} = useQuery(
		exposureOverviewQueryOptions({
			query: buildExposureOverviewQuery([...exposures], view, date),
			userId: user.id,
		}),
	);

	const overviewBuckets = response?.data;
	const hourDomain = response?.hourDomain;

	const { minHour, maxHour } = getHourDomain(
		hourDomain,
		overviewBuckets?.map((d) => d.time),
		"week", // The overview never shows linecharts so should always calculate hour domain with week padding
	);

	return (
		<div className="flex w-full min-w-0 flex-col gap-4">
			{isLoading ? (
				<Card className="flex h-24 w-full items-center">
					<p>{t(($) => $.common.loading)}</p>
				</Card>
			) : isError ? (
				<Card className="flex h-24 w-full items-center">
					<p>{t(($) => $.common.error)}</p>
				</Card>
			) : view === "month" ? (
				<CalendarWidget selectedDay={date} data={mapOverviewDataToTimeBucketStatuses(overviewBuckets ?? [])} />
			) : view === "week" ? (
				<WeekWidget
					dayStartHour={minHour}
					dayEndHour={maxHour}
					data={mapOverviewDataToTimeBucketStatuses(overviewBuckets ?? [])}
				/>
			) : !overviewBuckets || overviewBuckets.length === 0 ? (
				<ExposureGraphEmptyState date={date} locale={i18n.language} />
			) : (
				<DayWidget
					data={mapOverviewBucketsToChartRows(overviewBuckets ?? [], 0, 23)}
					startHour={minHour}
					endHour={maxHour}
				/>
			)}
		</div>
	);
}
