import { ChartDownload } from "@/components/chart-download.tsx";
import { DustFieldTabs } from "@/components/dust-field-tabs.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { EmptyState } from "@/features/aggregated-exposure/components/empty-state.tsx";
import { ExposureToggle } from "@/features/aggregated-exposure/components/exposure-toggle.tsx";
import { FiguresInfoDialog } from "@/features/aggregated-exposure/components/figures-info-dialog.tsx";
import { FilterDialog } from "@/features/aggregated-exposure/components/filter-dialog.tsx";
import { GroupTrendChart } from "@/features/aggregated-exposure/components/group-trend-chart.tsx";
import { PeriodNotice } from "@/features/aggregated-exposure/components/notices.tsx";
import { PeriodPickerLayout } from "@/features/aggregated-exposure/components/period-picker.tsx";
import { ThresholdBarLegend } from "@/features/aggregated-exposure/components/threshold-bar.tsx";
import { useAggregatedExposureSearchParams } from "@/features/aggregated-exposure/hooks/use-aggregated-exposure-search-params.ts";
import { useDashboardScope } from "@/features/aggregated-exposure/hooks/use-dashboard-scope.ts";
import {
	type ComparableGroup,
	getComparableGroupName,
	toComparableGroups,
} from "@/features/aggregated-exposure/model/compare.ts";
import { DOWNLOAD_FRACTION_DIGITS, getDownloadExposureName } from "@/features/aggregated-exposure/model/download.ts";
import {
	formatAverageShare,
	formatGroupValue,
	getGroupThreshold,
	getGroupUnitLabel,
	getMetricLabel,
	getOccupationLabel,
	getShareLabels,
	getThresholdNumberFormat,
	isExposureUnavailable,
} from "@/features/aggregated-exposure/model/groups.ts";
import {
	getSelectedDay,
	type PeriodSelection,
	toPeriodFilenamePart,
	toPeriodParams,
	toTrendPeriodParams,
} from "@/features/aggregated-exposure/model/period.ts";
import { getDaySharePoints } from "@/features/aggregated-exposure/model/trend-chart.ts";
import { StatisticCardLayout } from "@/features/statistic-card-layout.tsx";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import type { TranslateFn } from "@/i18n/config.ts";
import { useGetAggregateGroups, useGetAggregateGroupTrend } from "@/lib/api/generated/aggregate-exposure-data.ts";
import type { AggregatedTrendOkDto, TrendPointDto } from "@/lib/api/generated/models/index.ts";
import type { DustField, Exposure } from "@/lib/exposures.ts";
import { MOBILE_BREAKOUT_CARD_CLASSNAME } from "@/lib/mobile-breakout.ts";
import { type ExportColumn, toDownloadFilename } from "@/lib/plot-export.ts";
import { cn } from "@/lib/utils.ts";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";

export function GroupPage({ groupId }: { groupId: string }) {
	const { t } = useTranslation();
	const scope = useDashboardScope();
	const { search } = useLocation();
	const { exposure, setExposure, dustField, setDustField, resetGroupFilters, periodSelection } =
		useAggregatedExposureSearchParams();
	const groupsQuery = useGetAggregateGroups(toPeriodParams(periodSelection), {
		query: { select: toComparableGroups },
	});
	// The trend is only requested for a group the backend returned, never for the ID in the URL alone, and never for an
	// unavailable exposure
	const group = groupsQuery.data?.groups.find((summary) => summary.groupId === groupId);
	const trendQuery = useGetAggregateGroupTrend(
		group?.groupId ?? "",
		{
			exposure,
			dustField: exposure === "dust" ? dustField : undefined,
			...toTrendPeriodParams(periodSelection),
		},
		{ query: { enabled: group !== undefined && !isExposureUnavailable(exposure) } },
	);
	const isDay = periodSelection.period === "day";
	const dustFieldLabel = t(($) => $.exposures.dustFields[dustField]);
	const noDataText = getNoDataText(exposure, dustFieldLabel, isDay, t);

	const exposurePickers = (
		<>
			<ExposureToggle
				label={t(($) => $.aggregatedExposure.exposureLabel)}
				value={exposure}
				onValueChange={setExposure}
			/>
			{exposure === "dust" && (
				<DustFieldTabs
					value={dustField}
					onValueChange={setDustField}
					ariaLabel={t(($) => $.aggregatedExposure.group.dustFieldLabel)}
				/>
			)}
		</>
	);

	return (
		<div className="flex w-full min-w-0 flex-col gap-7">
			<div className="flex flex-col gap-4 border-b pb-5">
				{/* The info button sits in the page's top row, like on the overview and the compare page */}
				<div className="flex items-center justify-between gap-3">
					<Button asChild={true} variant="ghost" size="sm" className="-ml-2 w-fit">
						<Link to={{ pathname: scope.overviewPath, search }}>
							<ArrowLeft aria-hidden="true" className="size-4" />
							{t(($) => $.aggregatedExposure.group.back)}
						</Link>
					</Button>
					<FiguresInfoDialog dustField={dustField} />
				</div>
				<header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
					<div className="space-y-1">
						<p className="text-muted-foreground text-sm">
							{group
								? getEyebrow(group, scope.site === null, t)
								: t(($) => $.aggregatedExposure.group.eyebrow)}
						</p>
						{groupsQuery.isPending ? (
							<Skeleton className="h-8 w-56" />
						) : (
							<h1 className="font-medium text-2xl">
								{group
									? getComparableGroupName(group, t)
									: t(($) => $.aggregatedExposure.group.fallbackTitle)}
							</h1>
						)}
					</div>
				</header>
			</div>

			<PeriodPickerLayout selection={periodSelection}>
				<FilterDialog onReset={resetGroupFilters} className="sm:hidden">
					{exposurePickers}
				</FilterDialog>
				<div className="hidden flex-col gap-3 sm:flex">{exposurePickers}</div>

				<PeriodNotice periodSelection={periodSelection} />

				{groupsQuery.isPending ? (
					<Skeleton className="h-96 w-full" />
				) : groupsQuery.isError ? (
					<EmptyState title={t(($) => $.aggregatedExposure.group.error)} />
				) : group === undefined ? (
					<EmptyState title={t(($) => $.aggregatedExposure.group.unavailable.noSuchGroup)} />
				) : isExposureUnavailable(exposure) ? (
					<EmptyState title={t(($) => $.aggregatedExposure.exposureUnavailable[exposure])} />
				) : trendQuery.isPending ? (
					<Skeleton className="h-96 w-full" />
				) : trendQuery.isError ? (
					<EmptyState title={t(($) => $.aggregatedExposure.group.trendError)} />
				) : trendQuery.data.status === "unavailable" ? (
					// The group exists, since the backend returned it, so `noSuchGroup` means there are no measurements
					<EmptyState title={noDataText} />
				) : (
					<GroupDetails
						trend={trendQuery.data}
						group={group}
						periodSelection={periodSelection}
						exposure={exposure}
						dustField={dustField}
						noDataText={noDataText}
					/>
				)}
			</PeriodPickerLayout>
		</div>
	);
}

function getNoDataText(exposure: Exposure, dustFieldLabel: string, isDay: boolean, t: TranslateFn) {
	if (exposure === "dust") {
		return isDay
			? t(($) => $.aggregatedExposure.group.noDustFieldDayData, { dustField: dustFieldLabel })
			: t(($) => $.aggregatedExposure.group.noDustFieldData, { dustField: dustFieldLabel });
	}

	return isDay ? t(($) => $.aggregatedExposure.group.noDayData) : t(($) => $.aggregatedExposure.group.noData);
}

function getEyebrow(group: ComparableGroup, showsYard: boolean, t: TranslateFn) {
	if (group.level === "yard") {
		return t(($) => $.aggregatedExposure.filters.yard);
	}

	const eyebrow =
		group.level === "hall"
			? t(($) => $.aggregatedExposure.group.hallEyebrow)
			: t(($) => $.aggregatedExposure.group.eyebrow);
	// A group in a yard already names the yard in its title
	return showsYard && group.level !== "yardOccupation" ? `${eyebrow} · ${group.site}` : eyebrow;
}

function GroupDetails({
	trend,
	group,
	periodSelection,
	exposure,
	dustField,
	noDataText,
}: {
	trend: AggregatedTrendOkDto;
	group: ComparableGroup;
	periodSelection: PeriodSelection;
	exposure: Exposure;
	dustField: DustField;
	noDataText: string;
}) {
	const { t, i18n } = useTranslation();
	const formatDate = useFormatDate();
	const day = periodSelection.period === "day" ? getSelectedDay(periodSelection) : undefined;
	// A day shows its hours once, with the day's shares and, for vibration, the day's total points. The backend leaves
	// out the day before's vibration total, which it keeps until midnight UTC.
	const points = trend.points;
	const sharePoints = day === undefined ? points : getDaySharePoints(points, day);
	// Vibration's last hour is the day's total, since the workers' totals hold until midnight UTC
	const dayTotal = points.at(-1)?.value ?? null;
	const metricLabel = getMetricLabel(exposure, dustField, t);
	const threshold = getGroupThreshold(exposure, dustField);
	const isColored = points.some((point) => point.value !== null);
	// Like the overview's info dialog, so the thresholds keep their decimals, like 7.5 µg/m³
	const numberFormat = getThresholdNumberFormat(i18n.language);
	const formatThreshold = (value: number) => `${numberFormat.format(value)} ${getGroupUnitLabel(trend.unit, t)}`;
	// The key figures are shares of each worker's hours with measurements for every exposure and dust fraction. Each
	// exposure's caption says what counts as over, which for vibration is the day's total points so far.
	const kpiText = {
		...getShareLabels(t),
		actionCaption: t(($) => $.aggregatedExposure.group.timeOverActionCaption[exposure], {
			action: formatThreshold(threshold.warning),
		}),
		limitCaption: t(($) => $.aggregatedExposure.group.timeOverLimitCaption[exposure], {
			limit: formatThreshold(threshold.danger),
		}),
	};
	const exposureName = getDownloadExposureName(exposure, dustField, t);
	const downloadFilename = toDownloadFilename([
		group.site,
		group.hall,
		getWholeGroupPart(group, t),
		exposureName,
		toPeriodFilenamePart(periodSelection),
	]);
	const downloadColumns: Array<ExportColumn<TrendPointDto>> = [
		{ header: t(($) => $.chartDownload.columns.date), value: (point) => point.time },
		// The date column only holds the date, so a day's hours get their time in Norwegian time in a column of their own
		...(day === undefined
			? []
			: [
					{
						header: t(($) => $.chartDownload.columns.time),
						value: (point: TrendPointDto) => formatDate(point.time, "HH:mm"),
					},
				]),
		{
			header: `${metricLabel} (${getGroupUnitLabel(trend.unit, t)})`,
			value: (point) => point.value,
			fractionDigits: DOWNLOAD_FRACTION_DIGITS[trend.unit],
		},
		{
			header: `${kpiText.action} (%)`,
			value: (point) => toPercent(point.averageTimeOverAction),
			fractionDigits: 1,
		},
		{
			header: `${kpiText.limit} (%)`,
			value: (point) => toPercent(point.averageTimeOverLimit),
			fractionDigits: 1,
		},
	];

	return (
		<div className="flex flex-col gap-4">
			<Card className={cn("relative w-full gap-3", MOBILE_BREAKOUT_CARD_CLASSNAME)}>
				<div className="space-y-1">
					<h2 className="font-semibold">{t(($) => $.aggregatedExposure.group.trendTitle)}</h2>
					<p className="text-muted-foreground text-xs">
						{t(($) => $.aggregatedExposure.group.unitAndGranularity, {
							unit: getGroupUnitLabel(trend.unit, t),
							// The backend's day point for vibration is the average of the workers' daily totals, not of the day's hourly values
							granularity:
								exposure === "vibration"
									? t(($) => $.aggregatedExposure.group.vibrationGranularity[trend.granularity])
									: t(($) => $.aggregatedExposure.group.granularity[trend.granularity]),
						})}
					</p>
				</div>
				{points.length === 0 ? (
					<EmptyState title={noDataText} />
				) : points.every((point) => point.value === null) ? (
					<EmptyState title={t(($) => $.aggregatedExposure.group.allSuppressed)} />
				) : (
					<ChartDownload
						filename={downloadFilename}
						sheetName={exposureName}
						columns={downloadColumns}
						rows={points}
					>
						<GroupTrendChart
							points={points}
							unit={trend.unit}
							label={metricLabel}
							threshold={threshold}
							day={day}
						/>
					</ChartDownload>
				)}
				{isColored && <ThresholdBarLegend />}
			</Card>

			<div className="flex flex-col gap-3 md:grid md:grid-cols-3">
				{day !== undefined && exposure === "vibration" ? (
					// The points add up over the day, so their average means nothing. The last hour is the day's total.
					<StatisticCardLayout
						label={t(($) => $.aggregatedExposure.group.vibrationDayTotal)}
						value={
							dayTotal === null
								? t(($) => $.aggregatedExposure.group.noPeriodAverage)
								: formatGroupValue(dayTotal, trend.unit, t)
						}
						caption={t(($) => $.aggregatedExposure.group.vibrationDayTotalCaption)}
					/>
				) : (
					<StatisticCardLayout
						label={
							day === undefined
								? t(($) => $.aggregatedExposure.group.periodAverage)
								: t(($) => $.aggregatedExposure.group.dayAverage)
						}
						value={
							// Left out when every point is `null`
							trend.average === undefined
								? t(($) => $.aggregatedExposure.group.noPeriodAverage)
								: formatGroupValue(trend.average, trend.unit, t)
						}
						caption={
							exposure === "vibration"
								? t(($) => $.aggregatedExposure.group.vibrationPeriodAverage)
								: metricLabel
						}
					/>
				)}
				<StatisticCardLayout
					label={kpiText.action}
					value={formatAverageShare(sharePoints.map((point) => point.averageTimeOverAction))}
					caption={kpiText.actionCaption}
				/>
				<StatisticCardLayout
					label={kpiText.limit}
					value={formatAverageShare(sharePoints.map((point) => point.averageTimeOverLimit))}
					caption={kpiText.limitCaption}
				/>
			</div>
		</div>
	);
}

// A share like 0.125 as 12.5, for the downloaded files' percentage columns. The download code rounds it.
function toPercent(share: number | null) {
	return share === null ? null : share * 100;
}

function getWholeGroupPart({ hall, occupation }: ComparableGroup, t: TranslateFn) {
	if (occupation !== null) {
		return getOccupationLabel(occupation, t);
	}

	return hall === null ? t(($) => $.aggregatedExposure.compare.wholeYard) : t(($) => $.aggregatedExposure.wholeHall);
}
