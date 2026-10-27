import { DustFieldTabs } from "@/components/dust-field-tabs.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { EmptyState } from "@/features/aggregated-exposure/components/empty-state.tsx";
import { ExposureToggle } from "@/features/aggregated-exposure/components/exposure-toggle.tsx";
import { FilterDialog } from "@/features/aggregated-exposure/components/filter-dialog.tsx";
import { GroupTrendChart } from "@/features/aggregated-exposure/components/group-trend-chart.tsx";
import { PeriodAndPrivacyNotice } from "@/features/aggregated-exposure/components/notices.tsx";
import { PeriodPicker } from "@/features/aggregated-exposure/components/period-picker.tsx";
import { ThresholdBarLegend } from "@/features/aggregated-exposure/components/threshold-bar.tsx";
import { useAggregatedExposureSearchParams } from "@/features/aggregated-exposure/hooks/use-aggregated-exposure-search-params.ts";
import { useDashboardScope } from "@/features/aggregated-exposure/hooks/use-dashboard-scope.ts";
import {
	formatAverageShare,
	formatGroupValue,
	getGroupName,
	getGroupThreshold,
	getGroupUnitLabel,
	getHallName,
	getMetricLabel,
	getShareLabels,
	getThresholdNumberFormat,
	hasTimeOverThresholds,
	isExposureUnavailable,
	toGroupSummaries,
} from "@/features/aggregated-exposure/model/groups.ts";
import { toPeriodParams } from "@/features/aggregated-exposure/model/period.ts";
import { StatisticCardLayout } from "@/features/statistic-card-layout.tsx";
import { useGetAggregateGroups, useGetAggregateGroupTrend } from "@/lib/api/generated/aggregate-exposure-data.ts";
import type { AggregatedTrendOkDto } from "@/lib/api/generated/models/index.ts";
import type { DustField, Exposure } from "@/lib/exposures.ts";
import { MOBILE_BREAKOUT_CARD_CLASSNAME } from "@/lib/mobile-breakout.ts";
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
	const periodParams = toPeriodParams(periodSelection);
	const groupsQuery = useGetAggregateGroups(periodParams, {
		query: { select: toGroupSummaries },
	});
	// The trend is only requested for a group the backend returned, never for the ID in the URL alone, and never for an
	// unavailable exposure
	const occupationGroup = groupsQuery.data?.groups.find((summary) => summary.groupId === groupId);
	const hallGroup = groupsQuery.data?.halls.find((summary) => summary.groupId === groupId);
	const group = occupationGroup ?? hallGroup;
	const trendQuery = useGetAggregateGroupTrend(
		group?.groupId ?? "",
		{ exposure, dustField: exposure === "dust" ? dustField : undefined, ...periodParams },
		{ query: { enabled: group !== undefined && !isExposureUnavailable(exposure) } },
	);
	const dustFieldLabel = t(($) => $.exposures.dustFields[dustField]);

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
				<Button asChild={true} variant="ghost" size="sm" className="-ml-2 w-fit">
					<Link to={{ pathname: scope.overviewPath, search }}>
						<ArrowLeft aria-hidden="true" className="size-4" />
						{t(($) => $.aggregatedExposure.group.back)}
					</Link>
				</Button>
				<header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
					<div className="space-y-1">
						<p className="text-muted-foreground text-sm">
							{hallGroup
								? t(($) => $.aggregatedExposure.group.hallEyebrow)
								: t(($) => $.aggregatedExposure.group.eyebrow)}
							{scope.site === null && group && ` · ${group.site}`}
						</p>
						{groupsQuery.isPending ? (
							<Skeleton className="h-8 w-56" />
						) : (
							<h1 className="font-medium text-2xl">
								{occupationGroup
									? getGroupName(occupationGroup, t)
									: hallGroup
										? getHallName(hallGroup.hall, t)
										: t(($) => $.aggregatedExposure.group.fallbackTitle)}
							</h1>
						)}
					</div>
					<div className="hidden sm:block">
						<PeriodPicker selection={periodSelection} />
					</div>
				</header>
			</div>

			<FilterDialog periodSelection={periodSelection} onReset={resetGroupFilters} className="sm:hidden">
				{exposurePickers}
			</FilterDialog>
			<div className="hidden flex-col gap-3 sm:flex">{exposurePickers}</div>

			<PeriodAndPrivacyNotice periodSelection={periodSelection} />

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
				<EmptyState
					title={
						exposure === "dust"
							? t(($) => $.aggregatedExposure.group.noDustFieldData, { dustField: dustFieldLabel })
							: t(($) => $.aggregatedExposure.group.noData)
					}
				/>
			) : (
				<GroupDetails trend={trendQuery.data} exposure={exposure} dustField={dustField} />
			)}
		</div>
	);
}

function GroupDetails({
	trend,
	exposure,
	dustField,
}: {
	trend: AggregatedTrendOkDto;
	exposure: Exposure;
	dustField: DustField;
}) {
	const { t, i18n } = useTranslation();
	const dustFieldLabel = t(($) => $.exposures.dustFields[dustField]);
	const metricLabel = getMetricLabel(exposure, dustField, t);
	const threshold = getGroupThreshold(exposure, dustField);
	const isColored = trend.points.some((point) => point.value !== null);
	const timeOverUnavailableCaption = hasTimeOverThresholds(exposure, dustField)
		? undefined
		: t(($) => $.aggregatedExposure.group.timeOverOnlyForDustField, {
				dustField: t(($) => $.exposures.dustFields.pm1_twa),
			});
	// Like the overview's info dialog, so the thresholds keep their decimals, like 7.5 µg/m³
	const numberFormat = getThresholdNumberFormat(i18n.language);
	const formatThreshold = (value: number) => `${numberFormat.format(value)} ${getGroupUnitLabel(trend.unit, t)}`;
	const shareLabels = getShareLabels(exposure, t);
	// Vibration classifies the group's daily value in the chart instead of each hour, so its key figures are shares of days
	const kpiText =
		exposure === "vibration"
			? {
					...shareLabels,
					actionCaption: t(($) => $.aggregatedExposure.group.daysOverActionCaption, {
						action: threshold.warning,
					}),
					limitCaption: t(($) => $.aggregatedExposure.group.daysOverLimitCaption, {
						limit: threshold.danger,
					}),
				}
			: {
					...shareLabels,
					actionCaption: t(($) => $.aggregatedExposure.group.timeOverActionCaption, {
						action: formatThreshold(threshold.warning),
					}),
					limitCaption: t(($) => $.aggregatedExposure.group.timeOverLimitCaption, {
						limit: formatThreshold(threshold.danger),
					}),
				};

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
				{trend.points.length === 0 ? (
					<EmptyState
						title={
							exposure === "dust"
								? t(($) => $.aggregatedExposure.group.noDustFieldData, {
										dustField: dustFieldLabel,
									})
								: t(($) => $.aggregatedExposure.group.noData)
						}
					/>
				) : trend.points.every((point) => point.value === null) ? (
					<EmptyState title={t(($) => $.aggregatedExposure.group.allSuppressed)} />
				) : (
					<GroupTrendChart
						points={trend.points}
						unit={trend.unit}
						label={metricLabel}
						threshold={threshold}
					/>
				)}
				{isColored && <ThresholdBarLegend />}
			</Card>

			<div className="flex flex-col gap-3 md:grid md:grid-cols-3">
				<StatisticCardLayout
					label={t(($) => $.aggregatedExposure.group.periodAverage)}
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
				<StatisticCardLayout
					label={kpiText.action}
					value={formatAverageShare(trend.points.map((point) => point.averageTimeOverAction))}
					caption={timeOverUnavailableCaption ?? kpiText.actionCaption}
				/>
				<StatisticCardLayout
					label={kpiText.limit}
					value={formatAverageShare(trend.points.map((point) => point.averageTimeOverLimit))}
					caption={timeOverUnavailableCaption ?? kpiText.limitCaption}
				/>
			</div>
		</div>
	);
}
