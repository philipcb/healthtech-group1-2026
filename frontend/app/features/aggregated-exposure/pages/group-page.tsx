import { DustFieldTabs } from "@/components/dust-field-tabs.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import type { GroupSummaryRequest, GroupTrendResponse } from "@/features/aggregated-exposure/api/contracts.ts";
import { exposureKpisQueryOptions, groupTrendQueryOptions } from "@/features/aggregated-exposure/api/queries.ts";
import { EmptyState } from "@/features/aggregated-exposure/components/empty-state.tsx";
import { ExposureKpiPanel } from "@/features/aggregated-exposure/components/exposure-kpi-panel.tsx";
import { ExposureToggle } from "@/features/aggregated-exposure/components/exposure-toggle.tsx";
import { FilterDialog } from "@/features/aggregated-exposure/components/filter-dialog.tsx";
import { GroupTrendChart } from "@/features/aggregated-exposure/components/group-trend-chart.tsx";
import { PeriodAndPrivacyNotice } from "@/features/aggregated-exposure/components/notices.tsx";
import { PeriodPicker } from "@/features/aggregated-exposure/components/period-picker.tsx";
import { ThresholdBarLegend } from "@/features/aggregated-exposure/components/threshold-bar.tsx";
import { useAggregatedExposureSearchParams } from "@/features/aggregated-exposure/hooks/use-aggregated-exposure-search-params.ts";
import { useDashboardScope } from "@/features/aggregated-exposure/hooks/use-dashboard-scope.ts";
import {
	formatGroupValue,
	getGroupName,
	getGroupThreshold,
	getGroupUnitLabel,
	getHallName,
} from "@/features/aggregated-exposure/model/groups.ts";
import { StatisticCardLayout } from "@/features/statistic-card-layout.tsx";
import type { DustField, Exposure } from "@/lib/exposures.ts";
import { MOBILE_BREAKOUT_CARD_CLASSNAME } from "@/lib/mobile-breakout.ts";
import { cn } from "@/lib/utils.ts";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";

export function GroupPage({ groupId }: { groupId: string }) {
	const { t } = useTranslation();
	const scope = useDashboardScope();
	const { search } = useLocation();
	const { exposure, setExposure, dustField, setDustField, resetGroupFilters, periodSelection } =
		useAggregatedExposureSearchParams();
	const { period, month, year } = periodSelection;
	const { data, isPending, isError } = useQuery(
		groupTrendQueryOptions({
			groupId,
			exposure,
			dustField: exposure === "dust" ? dustField : undefined,
			period,
			month,
			year,
		}),
	);
	const group = data?.status === "ok" ? data.group : null;

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
							{group?.level === "hall"
								? t(($) => $.aggregatedExposure.group.hallEyebrow)
								: t(($) => $.aggregatedExposure.group.eyebrow)}
							{scope.site === null && group && ` · ${group.site}`}
						</p>
						{isPending ? (
							<Skeleton className="h-8 w-56" />
						) : (
							<h1 className="font-medium text-2xl">
								{group === null
									? t(($) => $.aggregatedExposure.group.fallbackTitle)
									: group.level === "hall"
										? getHallName(group.hall, t)
										: getGroupName(group, t)}
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

			{isPending ? (
				<Skeleton className="h-96 w-full" />
			) : isError ? (
				<EmptyState title={t(($) => $.aggregatedExposure.group.error)} />
			) : data.status === "unavailable" ? (
				<EmptyState title={t(($) => $.aggregatedExposure.group.unavailable[data.reason])} />
			) : (
				<GroupDetails
					trend={data}
					groupId={groupId}
					exposure={exposure}
					dustField={dustField}
					request={{ site: scope.site, period, month, year }}
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
	dustField: DustField;
	request: GroupSummaryRequest;
}) {
	const { t } = useTranslation();
	const kpiQuery = useQuery(exposureKpisQueryOptions({ ...request, level: trend.group.level, dustField }));
	const dustFieldLabel = t(($) => $.exposures.dustFields[dustField]);
	const metricLabel =
		exposure === "dust"
			? t(($) => $.aggregatedExposure.metrics.dust, { dustField: dustFieldLabel })
			: t(($) => $.aggregatedExposure.metrics[exposure]);
	const threshold = getGroupThreshold(exposure, dustField);
	const isColored = trend.points.some((point) => point.value !== null);

	return (
		<div className="flex flex-col gap-4">
			<Card className={cn("relative w-full gap-3", MOBILE_BREAKOUT_CARD_CLASSNAME)}>
				<div className="space-y-1">
					<h2 className="font-semibold">{t(($) => $.aggregatedExposure.group.trendTitle)}</h2>
					<p className="text-muted-foreground text-xs">
						{t(($) => $.aggregatedExposure.group.unitAndGranularity, {
							unit: getGroupUnitLabel(trend.unit, t),
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
						trend.average === null
							? t(($) => $.aggregatedExposure.group.noPeriodAverage)
							: formatGroupValue(trend.average, trend.unit, t)
					}
					caption={metricLabel}
				/>
				<ExposureKpiPanel kpiQuery={kpiQuery} groupId={groupId} exposure={exposure} />
			</div>
		</div>
	);
}
