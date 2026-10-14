import { Skeleton } from "@/components/ui/skeleton.tsx";
import { EmptyState } from "@/features/occupational-health-service/empty-state.tsx";
import { ExposureFilterToggle } from "@/features/occupational-health-service/exposure-filter-toggle.tsx";
import { GroupLevelToggle } from "@/features/occupational-health-service/group-level-toggle.tsx";
import { GroupList } from "@/features/occupational-health-service/group-list.tsx";
import { HallFilter } from "@/features/occupational-health-service/hall-filter.tsx";
import { HallList } from "@/features/occupational-health-service/hall-list.tsx";
import {
	type ExposureFilter,
	getShownExposures,
	MIN_GROUP_SIZE,
} from "@/features/occupational-health-service/occupational-health-service-groups.ts";
import { OccupationalHealthServicePeriodPicker } from "@/features/occupational-health-service/occupational-health-service-period-picker.tsx";
import { useOccupationalHealthServiceSearchParams } from "@/features/occupational-health-service/occupational-health-service-search-params.ts";
import { OverviewFilterDialog } from "@/features/occupational-health-service/overview-filter-dialog.tsx";
import { OverviewInfoDialog } from "@/features/occupational-health-service/overview-info-dialog.tsx";
import type {
	GroupSummary,
	GroupSummaryRequest,
} from "@/features/occupational-health-service/queries/occupational-health-service-contracts.ts";
import {
	groupSummariesQueryOptions,
	hallSummariesQueryOptions,
} from "@/features/occupational-health-service/queries/occupational-health-service-queries.ts";
import { DangerLevelBadgeLegend } from "@/features/occupational-health-service/threshold-bar.tsx";
import { useUser } from "@/features/user/user-context.tsx";
import { useQuery } from "@tanstack/react-query";
import { MapPin, ShieldCheck } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export default function OccupationalHealthServiceOverview() {
	const { t } = useTranslation();
	const { user } = useUser();
	const headingId = useId();
	const { exposureFilter, setExposureFilter, hall, setHall, level, setLevel, periodSelection } =
		useOccupationalHealthServiceSearchParams();
	const { period, month, year } = periodSelection;
	const request: GroupSummaryRequest = { site: user.location.site, period, month, year };
	// The groups decide which halls can be picked in both views, so the filter stays the same when switching
	const { data } = useQuery(groupSummariesQueryOptions(request));

	const halls = [...new Set(data?.groups.map((group) => group.hall))];
	const selectedHall = hall !== null && halls.includes(hall) ? hall : null;

	// Tighter on phones, so the first group's values show without scrolling
	return (
		<div className="flex w-full min-w-0 flex-col gap-5 sm:gap-7">
			<header className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between">
				<div className="space-y-1 sm:space-y-2">
					<p className="flex items-center gap-2 text-muted-foreground text-sm">
						<MapPin aria-hidden="true" className="size-4" />
						{user.location.site}
					</p>
					<h1 className="font-medium text-2xl">{t(($) => $.occupationalHealthServiceDashboard.title)}</h1>
					<p className="max-w-prose text-muted-foreground text-sm">
						{t(($) => $.occupationalHealthServiceDashboard.description)}
					</p>
				</div>
				<div className="hidden sm:block">
					<OccupationalHealthServicePeriodPicker selection={periodSelection} />
				</div>
			</header>

			{/*
			  Phones get every filter, the period included, in one dialog, so the results come first. From `sm` up, the
			  filters are shown inline. The dialog's controls only mount while it's open.
			*/}
			<OverviewFilterDialog halls={halls} selectedHall={selectedHall} className="sm:hidden" />
			<div className="hidden flex-wrap items-end justify-between gap-4 sm:flex">
				<div className="flex flex-wrap items-end gap-4">
					<GroupLevelToggle value={level} onValueChange={setLevel} />
					<ExposureFilterToggle value={exposureFilter} onValueChange={setExposureFilter} />
				</div>
				<HallFilter halls={halls} value={hall} onValueChange={setHall} />
			</div>

			<section aria-labelledby={headingId} className="flex flex-col gap-3">
				<div className="space-y-1">
					<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
						<h2 id={headingId} className="font-semibold">
							{level === "hall"
								? t(($) => $.occupationalHealthServiceDashboard.overview.hallsHeading)
								: t(($) => $.occupationalHealthServiceDashboard.overview.heading)}
						</h2>
						<OverviewInfoDialog />
					</div>
					{/* The period isn't repeated here, since the period picker, or the filter summary on phones, shows it */}
					<p className="flex max-w-prose items-start gap-1.5 text-muted-foreground text-xs">
						<ShieldCheck aria-hidden="true" className="mt-px size-3.5 shrink-0" />
						<span>
							{t(($) => $.occupationalHealthServiceDashboard.overview.aggregationNotice)}{" "}
							{t(($) => $.occupationalHealthServiceDashboard.privacyNotice, { count: MIN_GROUP_SIZE })}
						</span>
					</p>
					<DangerLevelBadgeLegend />
				</div>

				{level === "hall" ? (
					<HallResults request={request} hall={selectedHall} filter={exposureFilter} />
				) : (
					<GroupResults request={request} hall={selectedHall} filter={exposureFilter} />
				)}
			</section>
		</div>
	);
}

type ResultsProps = {
	request: GroupSummaryRequest;
	/** `null` shows every hall */
	hall: string | null;
	filter: ExposureFilter;
};

function GroupResults({ request, hall, filter }: ResultsProps) {
	const { t } = useTranslation();
	const { data, isPending, isError } = useQuery(groupSummariesQueryOptions(request));
	const groups = data?.groups.filter((group) => hall === null || group.hall === hall) ?? [];

	return isPending ? (
		<Skeleton className="h-64 w-full" />
	) : isError ? (
		<EmptyState title={t(($) => $.occupationalHealthServiceDashboard.overview.error)} />
	) : groups.length === 0 ? (
		<EmptyState
			title={t(($) => $.occupationalHealthServiceDashboard.overview.noGroups.title)}
			description={t(($) => $.occupationalHealthServiceDashboard.overview.noGroups.description)}
		/>
	) : groups.every((group) => hasNoValues(group.averages, filter)) ? (
		<EmptyState title={t(($) => $.occupationalHealthServiceDashboard.overview.noData)} />
	) : (
		<GroupList groups={groups} units={data.units} filter={filter} />
	);
}

/** Demo only, see `HallSummary` */
function HallResults({ request, hall, filter }: ResultsProps) {
	const { t } = useTranslation();
	const { data, isPending, isError } = useQuery(hallSummariesQueryOptions(request));
	const halls = data?.halls.filter((summary) => hall === null || summary.hall === hall) ?? [];

	return isPending ? (
		<Skeleton className="h-64 w-full" />
	) : isError ? (
		<EmptyState title={t(($) => $.occupationalHealthServiceDashboard.overview.hallsError)} />
	) : halls.length === 0 ? (
		<EmptyState
			title={t(($) => $.occupationalHealthServiceDashboard.overview.noHalls.title)}
			description={t(($) => $.occupationalHealthServiceDashboard.overview.noHalls.description)}
		/>
	) : halls.every((summary) => hasNoValues(summary.averages, filter)) ? (
		<EmptyState title={t(($) => $.occupationalHealthServiceDashboard.overview.noData)} />
	) : (
		<HallList halls={halls} units={data.units} filter={filter} />
	);
}

/** Whether none of the filter's exposures has a value, so the cards would only say there's no value */
function hasNoValues(averages: GroupSummary["averages"], filter: ExposureFilter) {
	return getShownExposures(filter).every((exposure) => averages[exposure] === null);
}
