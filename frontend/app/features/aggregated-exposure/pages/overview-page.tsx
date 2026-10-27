import { Skeleton } from "@/components/ui/skeleton.tsx";
import { EmptyState } from "@/features/aggregated-exposure/components/empty-state.tsx";
import { GroupList } from "@/features/aggregated-exposure/components/group-list.tsx";
import { OverviewInfoDialog } from "@/features/aggregated-exposure/components/overview-info-dialog.tsx";
import { OverviewSetup } from "@/features/aggregated-exposure/components/overview-setup.tsx";
import { PeriodPicker } from "@/features/aggregated-exposure/components/period-picker.tsx";
import { DangerLevelBadgeLegend } from "@/features/aggregated-exposure/components/threshold-bar.tsx";
import { useAggregatedExposureSearchParams } from "@/features/aggregated-exposure/hooks/use-aggregated-exposure-search-params.ts";
import { useDashboardScope } from "@/features/aggregated-exposure/hooks/use-dashboard-scope.ts";
import {
	type ComparableGroup,
	type CompareLevel,
	getComparePlace,
	toComparableGroups,
} from "@/features/aggregated-exposure/model/compare.ts";
import {
	type ExposureFilter,
	getShownExposures,
	isExposureUnavailable,
	MIN_GROUP_SIZE,
} from "@/features/aggregated-exposure/model/groups.ts";
import { toPeriodParams } from "@/features/aggregated-exposure/model/period.ts";
import { getYards } from "@/features/aggregated-exposure/model/scope.ts";
import { useGetAggregateGroups } from "@/lib/api/generated/aggregate-exposure-data.ts";
import type { GetAggregateGroupsParams, SampleAveragesDto } from "@/lib/api/generated/models/index.ts";
import { MapPin, ShieldCheck } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export function OverviewPage() {
	const { t } = useTranslation();
	const headingId = useId();
	const scope = useDashboardScope();
	const { YardFilter } = scope;
	const { exposureFilter, yard, hall, level, periodSelection } = useAggregatedExposureSearchParams();
	const params = toPeriodParams(periodSelection);
	const { data } = useGetAggregateGroups(params, {
		query: { select: toComparableGroups },
	});

	const yards = getYards(data?.groups);
	const selectedYard = YardFilter && yard !== null && yards.includes(yard) ? yard : null;
	const halls = [
		...new Set(
			(data?.groups ?? []).flatMap((group) =>
				group.hall !== null && (selectedYard === null || group.site === selectedYard) ? [group.hall] : [],
			),
		),
	];
	// A building only narrows the groups when they're buildings
	const selectedHall = getComparePlace(level) === "hall" && hall !== null && halls.includes(hall) ? hall : null;

	return (
		<div className="flex w-full min-w-0 flex-col gap-4">
			<header className="flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
					<h1 className="font-medium text-2xl">{scope.title}</h1>
					<p className="flex items-center gap-1.5 text-muted-foreground text-sm">
						<MapPin aria-hidden="true" className="size-4" />
						{selectedYard ?? scope.site ?? t(($) => $.aggregatedExposure.filters.allYards)}
					</p>
					{scope.description && (
						<p className="max-w-prose basis-full text-muted-foreground text-sm">{scope.description}</p>
					)}
				</div>
				<div className="hidden sm:block">
					<PeriodPicker selection={periodSelection} />
				</div>
			</header>

			<OverviewSetup yards={yards} selectedYard={selectedYard} halls={halls} selectedHall={selectedHall} />

			<section aria-labelledby={headingId} className="flex flex-col gap-3">
				<div className="space-y-1">
					<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
						<h2 id={headingId} className="font-semibold">
							{t(($) => $.aggregatedExposure.compare.level[level])}
						</h2>
						<OverviewInfoDialog exposures={getShownExposures(exposureFilter)} />
					</div>
					<p className="flex max-w-prose items-start gap-1.5 text-muted-foreground text-xs">
						<ShieldCheck aria-hidden="true" className="mt-px size-3.5 shrink-0" />
						<span>
							{t(($) => $.aggregatedExposure.overview.aggregationNotice)}{" "}
							{t(($) => $.aggregatedExposure.privacyNotice, { count: MIN_GROUP_SIZE })}
						</span>
					</p>
					<DangerLevelBadgeLegend />
				</div>

				<GroupResults
					params={params}
					level={level}
					yard={selectedYard}
					hall={selectedHall}
					filter={exposureFilter}
					showsYard={scope.site === null}
				/>
			</section>
		</div>
	);
}

type ResultsProps = {
	params: GetAggregateGroupsParams;
	level: CompareLevel;
	yard: string | null;
	hall: string | null;
	filter: ExposureFilter;
	showsYard: boolean;
};

function isSelected(group: ComparableGroup, level: CompareLevel, yard: string | null, hall: string | null) {
	return group.level === level && (yard === null || group.site === yard) && (hall === null || group.hall === hall);
}

function GroupResults({ params, level, yard, hall, filter, showsYard }: ResultsProps) {
	const { t } = useTranslation();
	const { data, isPending, isError } = useGetAggregateGroups(params, {
		query: { select: toComparableGroups },
	});
	const groups = data?.groups.filter((group) => isSelected(group, level, yard, hall)) ?? [];

	return isPending ? (
		<Skeleton className="h-64 w-full" />
	) : isError ? (
		<EmptyState title={t(($) => $.aggregatedExposure.overview.error)} />
	) : groups.length === 0 ? (
		<EmptyState
			title={t(($) => $.aggregatedExposure.overview.noGroups.title)}
			description={t(($) => $.aggregatedExposure.overview.noGroups.description)}
		/>
	) : filter !== "all" && isExposureUnavailable(filter) ? (
		<EmptyState title={t(($) => $.aggregatedExposure.exposureUnavailable[filter])} />
	) : groups.every((group) => hasNoValues(group.averages, filter)) ? (
		<EmptyState title={t(($) => $.aggregatedExposure.overview.noData)} />
	) : (
		<GroupList groups={groups} units={data.units} filter={filter} showsYard={showsYard} />
	);
}

function hasNoValues(averages: SampleAveragesDto, filter: ExposureFilter) {
	return getShownExposures(filter).every((exposure) => averages[exposure] === null);
}
