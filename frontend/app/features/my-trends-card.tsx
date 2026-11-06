import { ExposureIcon } from "@/components/exposure-icon.tsx";
import { Card, CardContent, CardLabelHeader } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useDate } from "@/features/date-picker/use-date.ts";
import { useUser } from "@/features/user/user-context.tsx";
import { useView } from "@/features/views/use-view.ts";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import { getGetExposureDataQueryOptions } from "@/lib/api/generated/exposure-data.ts";
import type { ExposureDataDto } from "@/lib/api/generated/models/exposureDataDto.zod.ts";
import { today, toTZDate } from "@/lib/date.ts";
import { aggregationFor, defaultDustField, type Exposure, exposures } from "@/lib/exposures.ts";
import { cn } from "@/lib/utils.ts";
import type { View } from "@/lib/views.ts";
import type { TZDate } from "@date-fns/tz";
import { useQueries } from "@tanstack/react-query";
import {
	getISOWeek,
	startOfDay,
	startOfMonth,
	startOfWeek,
	subDays,
	subMilliseconds,
	subMonths,
	subWeeks,
} from "date-fns";
import { ActivityIcon, ArrowDownIcon, ArrowRightIcon, ArrowUpIcon, MoveRightIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Feature flag: set to false to hide the card everywhere. */
const SHOW_MY_TRENDS: boolean = true;

/**
 * How many periods back to look for the previous period with data.
 * Days look up to a week back, so that e.g. Monday is compared with Friday when the weekend has no data.
 */
const LOOKBACK_PERIODS: Record<View, number> = { day: 7, week: 1, month: 1 };
/** Relative change within ±10 % counts as "same as". */
const SAME_THRESHOLD = 0.1;
/** Minimum measured time, as a share of normal, required to show a trend. */
const MIN_COVERAGE = 0.5;

type DangerLevel = ExposureDataDto["dangerLevel"];
type Trend = "higher" | "same" | "lower";

/** Ordering of danger levels, used to find the highest zone reached. */
const levelRank: Record<DangerLevel, number> = { safe: 0, warning: 1, danger: 2 };

/** Zone colours, the same as in the summary boxes. */
const zoneClass: Record<DangerLevel, string> = {
	safe: "bg-safe-subtle text-safe-text",
	warning: "bg-warning-subtle text-warning-text",
	danger: "bg-danger-subtle text-danger-text",
};

/** Computed trend for one exposure type. */
interface TrendRow {
	exposure: Exposure;
	enoughData: boolean;
	zone: DangerLevel | null;
	share: number;
	baselineShare: number;
	trend: Trend;
}

/**
 * Computes the trend for one exposure type.
 * Measured time is the number of hourly buckets with data.
 * @param data Hourly buckets for the selected period and the periods before it.
 * @param periodStart Start of the selected period.
 * @param baselineStart Start of the previous period with data, or null if there is none.
 * @returns Share of measured time above the action value, highest zone and trend.
 */
function buildRow(
	exposure: Exposure,
	data: Array<ExposureDataDto>,
	periodStart: TZDate,
	baselineStart: TZDate | null,
): TrendRow {
	const last = data.filter((point) => point.time >= periodStart);
	const baseline =
		baselineStart === null ? [] : data.filter((point) => point.time >= baselineStart && point.time < periodStart);

	const normalHours = baseline.length;

	/** Share of points that are above the action value (warning or danger). */
	const overShare = (points: Array<ExposureDataDto>) =>
		points.length > 0 ? points.filter((point) => point.dangerLevel !== "safe").length / points.length : 0;

	const share = overShare(last);
	const baselineShare = overShare(baseline);

	const zone = last.reduce<DangerLevel | null>(
		(highest, point) =>
			highest === null || levelRank[point.dangerLevel] > levelRank[highest] ? point.dangerLevel : highest,
		null,
	);

	let trend: Trend = "same";
	if (baselineShare === 0) {
		trend = share > 0 ? "higher" : "same";
	} else {
		const change = (share - baselineShare) / baselineShare;
		trend = change > SAME_THRESHOLD ? "higher" : change < -SAME_THRESHOLD ? "lower" : "same";
	}

	return {
		exposure,
		enoughData: normalHours > 0 && last.length >= normalHours * MIN_COVERAGE,
		zone,
		share,
		baselineShare,
		trend,
	};
}

/** Neutral arrow per trend. Colour is never used for the direction. */
const trendIcon = { higher: ArrowUpIcon, same: ArrowRightIcon, lower: ArrowDownIcon };

/**
 * "My trends" card: compares the operator's exposure in the selected day/week/month with the previous one.
 * Shown only in the operator's own view. Hidden when SHOW_MY_TRENDS is false.
 */
export function MyTrendsCard({ className }: { className?: string }) {
	return SHOW_MY_TRENDS ? <MyTrendsCardContent className={className} /> : null;
}

/**
 * Fetches data and renders the card. Follows the selected date and view;
 * an unfinished period is replaced with the last completed period of the same type.
 */
function MyTrendsCardContent({ className }: { className?: string }) {
	const { t } = useTranslation();
	const { user } = useUser();
	const { view } = useView();
	const { date } = useDate();
	const formatDate = useFormatDate();

	/** Start of the day, week (Monday) or month containing the date. */
	const startOfPeriod = (value: TZDate) =>
		toTZDate(
			view === "month"
				? startOfMonth(value)
				: view === "week"
					? startOfWeek(value, { weekStartsOn: 1 })
					: startOfDay(value),
		);
	/** Moves the date the given number of days/weeks/months back (negative moves forward). */
	const subPeriods = (value: TZDate, amount: number) =>
		toTZDate(
			view === "month"
				? subMonths(value, amount)
				: view === "week"
					? subWeeks(value, amount)
					: subDays(value, amount),
		);

	const currentStart = startOfPeriod(today());
	const selectedStart = startOfPeriod(date);
	const periodStart = selectedStart < currentStart ? selectedStart : subPeriods(currentStart, 1);
	const lookbackStart = subPeriods(periodStart, LOOKBACK_PERIODS[view]);
	const endTime = toTZDate(subMilliseconds(subPeriods(periodStart, -1), 1));

	const responses = useQueries({
		queries: exposures.map((exposure) =>
			getGetExposureDataQueryOptions(exposure, user.id, {
				startTime: lookbackStart,
				endTime,
				granularity: "hour",
				function: aggregationFor(exposure, false),
				field: exposure === "dust" ? defaultDustField : undefined,
			}),
		),
	});

	const title = t(($) => $.myTrends.title);

	if (responses.some((response) => response.isError)) {
		return (
			<TrendsShell title={title} className={className}>
				<p className="text-sm">{t(($) => $.common.error)}</p>
			</TrendsShell>
		);
	}

	if (responses.some((response) => !response.data)) {
		return (
			<TrendsShell title={title} className={className}>
				<Skeleton className="h-4 w-3/4" />
				<Skeleton className="h-4 w-1/2" />
			</TrendsShell>
		);
	}

	const exposureData = exposures.map((exposure, index) => ({
		exposure,
		data: responses[index]?.data?.data ?? [],
	}));
	const withSensor = exposureData.filter(({ data }) => data.length > 0);

	if (withSensor.length === 0) {
		return null;
	}

	const allTimes = new Set(withSensor.flatMap(({ data }) => data.map((point) => point.time.getTime())));
	const lastHours = [...allTimes].filter((time) => time >= periodStart.getTime()).length;
	const earlierTimes = [...allTimes].filter((time) => time < periodStart.getTime());
	/** The same previous period is used for every exposure type: the latest one with any data. */
	const baselineStart = earlierTimes.length > 0 ? startOfPeriod(toTZDate(Math.max(...earlierTimes))) : null;
	const normalHours =
		baselineStart === null ? 0 : earlierTimes.filter((time) => time >= baselineStart.getTime()).length;

	const rows = withSensor.map(({ exposure, data }) => buildRow(exposure, data, periodStart, baselineStart));

	/** Label for a period: date, ISO week number or month name. */
	const periodLabel = (value: TZDate) =>
		view === "month"
			? formatDate(value, "LLLL")
			: view === "week"
				? String(getISOWeek(value))
				: formatDate(value, "d MMMM");
	const period = periodLabel(periodStart);
	const previous = t(($) => $.myTrends.previous[view]);

	return (
		<TrendsShell title={title} className={className}>
			<p className="text-muted-foreground text-xs">
				{t(($) => $.myTrends.period[view], {
					period: period.charAt(0).toUpperCase() + period.slice(1),
					baseline: periodLabel(baselineStart ?? subPeriods(periodStart, 1)),
				})}
			</p>

			<ul className="flex flex-col gap-2">
				{rows.map((row) => {
					const TrendIcon = trendIcon[row.trend];

					return (
						<li key={row.exposure} className="flex flex-col gap-1 p-2">
							<span className="flex items-center justify-between gap-2">
								<span className="flex items-center gap-2 font-medium text-sm">
									<ExposureIcon type={row.exposure} />
									{t(($) => $.exposures[row.exposure])}
								</span>
								{row.enoughData && row.zone && (
									<span
										className={cn("shrink-0 rounded-md px-2 py-0.5 text-xs", zoneClass[row.zone])}
									>
										{t(($) => $.exposureSummary.aggregated[row.zone as DangerLevel])}
									</span>
								)}
							</span>

							{row.enoughData && row.zone ? (
								<span className="flex flex-col gap-0.5 text-muted-foreground text-xs">
									<span className="flex items-center gap-1">
										<TrendIcon className="size-3.5 shrink-0" />
										{t(($) => $.myTrends.trend[row.trend], { previous })}
									</span>
									<span className="flex items-center gap-1 font-medium text-foreground tabular-nums">
										{t(($) => $.myTrends.share, { value: Math.round(row.baselineShare * 100) })}
										<MoveRightIcon className="size-3.5 text-muted-foreground" />
										{t(($) => $.myTrends.share, { value: Math.round(row.share * 100) })}
									</span>
								</span>
							) : (
								<span className="text-muted-foreground text-xs">
									{t(($) => $.myTrends.notEnoughData)}
								</span>
							)}
						</li>
					);
				})}
			</ul>

			<div className="flex flex-col gap-0.5 border-t pt-2 text-muted-foreground text-xs">
				<p>{t(($) => $.myTrends.shareExplanation)}</p>
				<p>{t(($) => $.myTrends.coverage, { hours: lastHours, normal: normalHours, previous })}</p>
				<p>{t(($) => $.myTrends.private)}</p>
			</div>
		</TrendsShell>
	);
}

/** Card frame with header, shared by the loading, error and content states. */
function TrendsShell({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
	return (
		<Card muted={true} variant="labeled" className={cn("w-full", className)}>
			<CardLabelHeader>
				<ActivityIcon className="size-4 text-muted-foreground" />
				<h2 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">{title}</h2>
			</CardLabelHeader>
			<CardContent className="flex flex-col gap-3">{children}</CardContent>
		</Card>
	);
}
