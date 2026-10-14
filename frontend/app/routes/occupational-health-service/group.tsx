import { DustFieldTabs } from "@/components/dust-field-tabs.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { EmptyState } from "@/features/occupational-health-service/empty-state.tsx";
import { ExposureKpiPanel } from "@/features/occupational-health-service/exposure-kpi-panel.tsx";
import { GroupTrendChart } from "@/features/occupational-health-service/group-trend-chart.tsx";
import { OccupationalHealthServiceExposureToggle } from "@/features/occupational-health-service/occupational-health-service-exposure-toggle.tsx";
import { OccupationalHealthServiceFilterDialog } from "@/features/occupational-health-service/occupational-health-service-filter-dialog.tsx";
import {
	formatGroupValue,
	getGroupName,
	getGroupThreshold,
	getGroupUnitLabel,
	getHallName,
} from "@/features/occupational-health-service/occupational-health-service-groups.ts";
import { PeriodAndPrivacyNotice } from "@/features/occupational-health-service/occupational-health-service-notices.tsx";
import { OccupationalHealthServicePeriodPicker } from "@/features/occupational-health-service/occupational-health-service-period-picker.tsx";
import { useOccupationalHealthServiceSearchParams } from "@/features/occupational-health-service/occupational-health-service-search-params.ts";
import type {
	GroupSummaryRequest,
	GroupTrendResponse,
} from "@/features/occupational-health-service/queries/occupational-health-service-contracts.ts";
import {
	exposureKpisQueryOptions,
	groupTrendQueryOptions,
} from "@/features/occupational-health-service/queries/occupational-health-service-queries.ts";
import { ThresholdBarLegend } from "@/features/occupational-health-service/threshold-bar.tsx";
import { StatisticCardLayout } from "@/features/statistic-card-layout.tsx";
import { useUser } from "@/features/user/user-context.tsx";
import type { DustField, Exposure } from "@/lib/exposures.ts";
import { MOBILE_BREAKOUT_CARD_CLASSNAME } from "@/lib/mobile-breakout.ts";
import { cn } from "@/lib/utils.ts";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { href, Link, useLocation } from "react-router";
import type { Route } from "./+types/group";

export default function OccupationalHealthServiceGroup({ params }: Route.ComponentProps) {
	const { t } = useTranslation();
	const { user } = useUser();
	const { search } = useLocation();
	const { exposure, setExposure, dustField, setDustField, resetGroupFilters, periodSelection } =
		useOccupationalHealthServiceSearchParams();
	const { period, month, year } = periodSelection;
	const { data, isPending, isError } = useQuery(
		groupTrendQueryOptions({
			groupId: params.groupId,
			exposure,
			// Only dust has fractions, so other exposures share one cache entry whichever fraction is selected
			dustField: exposure === "dust" ? dustField : undefined,
			period,
			month,
			year,
		}),
	);
	// A group, or a whole hall
	const group = data?.status === "ok" ? data.group : null;

	const exposurePickers = (
		<>
			<OccupationalHealthServiceExposureToggle
				label={t(($) => $.occupationalHealthServiceDashboard.exposureLabel)}
				value={exposure}
				onValueChange={setExposure}
			/>
			{exposure === "dust" && (
				<DustFieldTabs
					value={dustField}
					onValueChange={setDustField}
					ariaLabel={t(($) => $.occupationalHealthServiceDashboard.group.dustFieldLabel)}
				/>
			)}
		</>
	);

	return (
		<div className="flex w-full min-w-0 flex-col gap-7">
			<div className="flex flex-col gap-4 border-b pb-5">
				<Button asChild={true} variant="ghost" size="sm" className="-ml-2 w-fit">
					{/* Keeps the selection, so the overview shows the same exposure and period */}
					<Link to={{ pathname: href("/occupational-health-service"), search }}>
						<ArrowLeft aria-hidden="true" className="size-4" />
						{t(($) => $.occupationalHealthServiceDashboard.group.back)}
					</Link>
				</Button>
				<header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
					<div className="space-y-1">
						<p className="text-muted-foreground text-sm">
							{group?.level === "hall"
								? t(($) => $.occupationalHealthServiceDashboard.group.hallEyebrow)
								: t(($) => $.occupationalHealthServiceDashboard.group.eyebrow)}
						</p>
						{isPending ? (
							<Skeleton className="h-8 w-56" />
						) : (
							<h1 className="font-medium text-2xl">
								{group === null
									? t(($) => $.occupationalHealthServiceDashboard.group.fallbackTitle)
									: group.level === "hall"
										? getHallName(group.hall, t)
										: getGroupName(group, t)}
							</h1>
						)}
					</div>
					<div className="hidden sm:block">
						<OccupationalHealthServicePeriodPicker selection={periodSelection} />
					</div>
				</header>
			</div>

			{/*
			  Phones get every filter, the period included, in one dialog, the same as the overview. The period still shows
			  in the notice below, so it isn't repeated next to the button. From `sm` up, the filters are shown inline.
			*/}
			<OccupationalHealthServiceFilterDialog
				periodSelection={periodSelection}
				onReset={resetGroupFilters}
				className="sm:hidden"
			>
				{exposurePickers}
			</OccupationalHealthServiceFilterDialog>
			<div className="hidden flex-col gap-3 sm:flex">{exposurePickers}</div>

			<PeriodAndPrivacyNotice periodSelection={periodSelection} />

			{isPending ? (
				<Skeleton className="h-96 w-full" />
			) : isError ? (
				<EmptyState title={t(($) => $.occupationalHealthServiceDashboard.group.error)} />
			) : data.status === "unavailable" ? (
				<EmptyState title={t(($) => $.occupationalHealthServiceDashboard.group.unavailable[data.reason])} />
			) : (
				<GroupDetails
					trend={data}
					groupId={params.groupId}
					exposure={exposure}
					dustField={dustField}
					request={{ site: user.location.site, period, month, year }}
				/>
			)}
		</div>
	);
}

function GroupDetails({
	trend,
	groupId,
	exposure,
	dustField,
	request,
}: {
	trend: Extract<GroupTrendResponse, { status: "ok" }>;
	groupId: string;
	exposure: Exposure;
	/** Only used for dust */
	dustField: DustField;
	/** The site and period the KPIs are fetched for */
	request: GroupSummaryRequest;
}) {
	const { t } = useTranslation();
	// The trend tells whether this is a group or a whole hall, which decides which KPIs to fetch
	// For the selected dust fraction, so dust's KPI belongs to the same fraction as the trend and average
	const kpiQuery = useQuery(exposureKpisQueryOptions({ ...request, level: trend.group.level, dustField }));
	const dustFieldLabel = t(($) => $.exposures.dustFields[dustField]);
	const metricLabel =
		exposure === "dust"
			? t(($) => $.occupationalHealthServiceDashboard.metrics.dust, { dustField: dustFieldLabel })
			: t(($) => $.occupationalHealthServiceDashboard.metrics[exposure]);
	// The same rule as the overview's bars. Its colors are explained by the legend below the trend, whenever it's colored.
	const threshold = getGroupThreshold(exposure, dustField);
	const isColored = trend.points.some((point) => point.value !== null);

	return (
		<div className="flex flex-col gap-4">
			{/* Spans the whole screen width below `lg`, the same as the operator's and foreman's charts */}
			<Card className={cn("relative w-full gap-3", MOBILE_BREAKOUT_CARD_CLASSNAME)}>
				<div className="space-y-1">
					<h2 className="font-semibold">{t(($) => $.occupationalHealthServiceDashboard.group.trendTitle)}</h2>
					<p className="text-muted-foreground text-xs">
						{t(($) => $.occupationalHealthServiceDashboard.group.unitAndGranularity, {
							unit: getGroupUnitLabel(trend.unit, t),
							// Vibration explains what each point averages, since it's an average of per-person averages
							granularity:
								exposure === "vibration"
									? t(
											($) =>
												$.occupationalHealthServiceDashboard.group.vibrationGranularity[
													trend.granularity
												],
										)
									: t(
											($) =>
												$.occupationalHealthServiceDashboard.group.granularity[
													trend.granularity
												],
										),
						})}
					</p>
				</div>
				{trend.points.length === 0 ? (
					<EmptyState
						title={
							exposure === "dust"
								? t(($) => $.occupationalHealthServiceDashboard.group.noDustFieldData, {
										dustField: dustFieldLabel,
									})
								: t(($) => $.occupationalHealthServiceDashboard.group.noData)
						}
					/>
				) : trend.points.every((point) => point.value === null) ? (
					<EmptyState title={t(($) => $.occupationalHealthServiceDashboard.group.allSuppressed)} />
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

			{/*
			  Below the trend, laid out like the operator's and foreman's statistics: one per row on phones, three from `md`
			  up. Without their share of the limit value or danger colors, since a group average can't be compared directly
			  with individual thresholds, and not collapsible, so the metric, like the dust fraction, always shows.
			*/}
			<div className="flex flex-col gap-3 md:grid md:grid-cols-3">
				<StatisticCardLayout
					label={t(($) => $.occupationalHealthServiceDashboard.group.periodAverage)}
					value={
						trend.average === null
							? t(($) => $.occupationalHealthServiceDashboard.group.noPeriodAverage)
							: formatGroupValue(trend.average, trend.unit, t)
					}
					caption={metricLabel}
				/>
				<ExposureKpiPanel kpiQuery={kpiQuery} groupId={groupId} exposure={exposure} />
			</div>
		</div>
	);
}
