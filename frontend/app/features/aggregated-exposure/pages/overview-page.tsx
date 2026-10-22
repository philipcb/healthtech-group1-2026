import { Skeleton } from "@/components/ui/skeleton.tsx";
import { EmptyState } from "@/features/aggregated-exposure/components/empty-state.tsx";
import { ExposureFilterToggle } from "@/features/aggregated-exposure/components/exposure-filter-toggle.tsx";
import { GroupLevelToggle } from "@/features/aggregated-exposure/components/group-level-toggle.tsx";
import { GroupList } from "@/features/aggregated-exposure/components/group-list.tsx";
import { HallFilter } from "@/features/aggregated-exposure/components/hall-filter.tsx";
import { HallList } from "@/features/aggregated-exposure/components/hall-list.tsx";
import { OverviewFilterDialog } from "@/features/aggregated-exposure/components/overview-filter-dialog.tsx";
import { OverviewInfoDialog } from "@/features/aggregated-exposure/components/overview-info-dialog.tsx";
import { PeriodPicker } from "@/features/aggregated-exposure/components/period-picker.tsx";
import { DangerLevelBadgeLegend } from "@/features/aggregated-exposure/components/threshold-bar.tsx";
import { useAggregatedExposureSearchParams } from "@/features/aggregated-exposure/hooks/use-aggregated-exposure-search-params.ts";
import { useDashboardScope } from "@/features/aggregated-exposure/hooks/use-dashboard-scope.ts";
import {
	type ExposureFilter,
	getShownExposures,
	isExposureUnavailable,
	MIN_GROUP_SIZE,
	toGroupSummaries,
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
	const { exposureFilter, setExposureFilter, yard, setYard, hall, setHall, level, setLevel, periodSelection } =
		useAggregatedExposureSearchParams();
	const params = toPeriodParams(periodSelection);
	const { data } = useGetAggregateGroups(params, {
		query: { select: toGroupSummaries },
	});

	const yards = getYards(data?.groups);
	const selectedYard = YardFilter && yard !== null && yards.includes(yard) ? yard : null;
	const halls = [
		...new Set(
			[...(data?.groups ?? []), ...(data?.halls ?? [])]
				.filter((group) => selectedYard === null || group.site === selectedYard)
				.map((group) => group.hall),
		),
	];
	const selectedHall = hall !== null && halls.includes(hall) ? hall : null;

	return (
		<div className="flex w-full min-w-0 flex-col gap-5 sm:gap-7">
			<header className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between">
				<div className="space-y-1 sm:space-y-2">
					<p className="flex items-center gap-2 text-muted-foreground text-sm">
						<MapPin aria-hidden="true" className="size-4" />
						{selectedYard ?? scope.site ?? t(($) => $.aggregatedExposure.filters.allYards)}
					</p>
					<h1 className="font-medium text-2xl">{scope.title}</h1>
					{scope.description && (
						<p className="max-w-prose text-muted-foreground text-sm">{scope.description}</p>
					)}
				</div>
				<div className="hidden sm:block">
					<PeriodPicker selection={periodSelection} />
				</div>
			</header>

			<OverviewFilterDialog
				yards={yards}
				selectedYard={selectedYard}
				halls={halls}
				selectedHall={selectedHall}
				className="sm:hidden"
			/>
			<div className="hidden flex-wrap items-end justify-between gap-4 sm:flex">
				<div className="flex flex-wrap items-end gap-4">
					<GroupLevelToggle value={level} onValueChange={setLevel} />
					<ExposureFilterToggle value={exposureFilter} onValueChange={setExposureFilter} />
				</div>
				<div className="flex flex-wrap items-end gap-4">
					{YardFilter && <YardFilter yards={yards} value={yard} onValueChange={setYard} />}
					<HallFilter halls={halls} value={hall} onValueChange={setHall} />
				</div>
			</div>

			<section aria-labelledby={headingId} className="flex flex-col gap-3">
				<div className="space-y-1">
					<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
						<h2 id={headingId} className="font-semibold">
							{level === "hall"
								? t(($) => $.aggregatedExposure.overview.hallsHeading)
								: t(($) => $.aggregatedExposure.overview.heading)}
						</h2>
						<OverviewInfoDialog />
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

				{level === "hall" ? (
					<HallResults
						params={params}
						yard={selectedYard}
						hall={selectedHall}
						filter={exposureFilter}
						showsYard={scope.site === null}
					/>
				) : (
					<GroupResults
						params={params}
						yard={selectedYard}
						hall={selectedHall}
						filter={exposureFilter}
						showsYard={scope.site === null}
					/>
				)}
			</section>
		</div>
	);
}

type ResultsProps = {
	params: GetAggregateGroupsParams;
	yard: string | null;
	hall: string | null;
	filter: ExposureFilter;
	showsYard: boolean;
};

function isSelected(summary: { site: string; hall: string }, yard: string | null, hall: string | null) {
	return (yard === null || summary.site === yard) && (hall === null || summary.hall === hall);
}

function GroupResults({ params, yard, hall, filter, showsYard }: ResultsProps) {
	const { t } = useTranslation();
	const { data, isPending, isError } = useGetAggregateGroups(params, {
		query: { select: toGroupSummaries },
	});
	const groups = data?.groups.filter((group) => isSelected(group, yard, hall)) ?? [];

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

function HallResults({ params, yard, hall, filter, showsYard }: ResultsProps) {
	const { t } = useTranslation();
	const { data, isPending, isError } = useGetAggregateGroups(params, {
		query: { select: toGroupSummaries },
	});
	const halls = data?.halls.filter((summary) => isSelected(summary, yard, hall)) ?? [];

	return isPending ? (
		<Skeleton className="h-64 w-full" />
	) : isError ? (
		<EmptyState title={t(($) => $.aggregatedExposure.overview.hallsError)} />
	) : halls.length === 0 ? (
		<EmptyState
			title={t(($) => $.aggregatedExposure.overview.noHalls.title)}
			description={t(($) => $.aggregatedExposure.overview.noHalls.description)}
		/>
	) : filter !== "all" && isExposureUnavailable(filter) ? (
		<EmptyState title={t(($) => $.aggregatedExposure.exposureUnavailable[filter])} />
	) : halls.every((summary) => hasNoValues(summary.averages, filter)) ? (
		<EmptyState title={t(($) => $.aggregatedExposure.overview.noData)} />
	) : (
		<HallList halls={halls} units={data.units} filter={filter} showsYard={showsYard} />
	);
}

function hasNoValues(averages: SampleAveragesDto, filter: ExposureFilter) {
	return getShownExposures(filter).every((exposure) => averages[exposure] === null);
}
