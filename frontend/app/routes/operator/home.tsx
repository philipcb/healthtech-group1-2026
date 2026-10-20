import { Card } from "@/components/ui/card.tsx";
import { CalendarWidget } from "@/features/calendar-widget/calendar-widget.tsx";
import { useDate } from "@/features/date-picker/use-date.ts";
import { DayWidget } from "@/features/day-widget/day-widget.tsx";
import { ExposureGraphEmptyState } from "@/features/statistic-card.tsx";
import { useUser } from "@/features/user/user-context.tsx";
import { useView } from "@/features/views/use-view.ts";
import { WeekWidget } from "@/features/week-widget/week-widget.tsx";
import { useGetExposureOverview } from "@/lib/api/generated/exposure-data.ts";
import { getStartEnd } from "@/lib/date.ts";
import { getHourDomain } from "@/lib/exposure-time-domain.ts";
import { aggregationFor, defaultDustField } from "@/lib/exposures.ts";
import { mapOverviewBucketsToChartRows, mapOverviewDataToTimeBucketStatuses } from "@/lib/time-bucket-utils.ts";
import { overviewGranularityByView } from "@/lib/views.ts";
import { useTranslation } from "react-i18next";

export default function OperatorHome() {
	const { t, i18n } = useTranslation();

	const { view } = useView();
	const { date } = useDate();

	const { user } = useUser();

	const { startTime, endTime } = getStartEnd(view, date);
	const granularity = overviewGranularityByView[view];

	// NOTE: If we later add a peak noise switch here it wouldn't work because we don't return peakDangerLevel in the overview query.
	const {
		data: response,
		isLoading,
		isError,
	} = useGetExposureOverview(user.id, {
		dust: { startTime, endTime, granularity, function: aggregationFor("dust", false), field: defaultDustField },
		noise: { startTime, endTime, granularity, function: aggregationFor("noise", false) },
		vibration: { startTime, endTime, granularity, function: aggregationFor("vibration", false) },
	});

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
