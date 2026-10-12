import { Skeleton } from "@/components/ui/skeleton.tsx";
import { EmptyState } from "@/features/medical-team/empty-state.tsx";
import { ExposureFilterToggle } from "@/features/medical-team/exposure-filter-toggle.tsx";
import { GroupLevelToggle } from "@/features/medical-team/group-level-toggle.tsx";
import { GroupList } from "@/features/medical-team/group-list.tsx";
import { HallFilter } from "@/features/medical-team/hall-filter.tsx";
import { HallList } from "@/features/medical-team/hall-list.tsx";
import { MedicalPeriodPicker } from "@/features/medical-team/medical-period-picker.tsx";
import { type ExposureFilter, getShownExposures } from "@/features/medical-team/medical-team-groups.ts";
import { PeriodAndPrivacyNotice } from "@/features/medical-team/medical-team-notices.tsx";
import { useMedicalTeamSearchParams } from "@/features/medical-team/medical-team-search-params.ts";
import { OverviewInfoDialog } from "@/features/medical-team/overview-info-dialog.tsx";
import type { GroupSummary, GroupSummaryRequest } from "@/features/medical-team/queries/medical-team-contracts.ts";
import {
	groupSummariesQueryOptions,
	hallSummariesQueryOptions,
} from "@/features/medical-team/queries/medical-team-queries.ts";
import { ThresholdBarLegend } from "@/features/medical-team/threshold-bar.tsx";
import { useUser } from "@/features/user/user-context.tsx";
import { useQuery } from "@tanstack/react-query";
import { InfoIcon, MapPin } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

export default function MedicalTeamOverview() {
	const { t } = useTranslation();
	const { user } = useUser();
	const headingId = useId();
	const { exposureFilter, setExposureFilter, hall, setHall, level, setLevel, periodSelection } =
		useMedicalTeamSearchParams();
	const { period, month, year } = periodSelection;
	const request: GroupSummaryRequest = { site: user.location.site, period, month, year };
	// The groups decide which halls can be picked in both views, so the filter stays the same when switching
	const { data } = useQuery(groupSummariesQueryOptions(request));

	const halls = [...new Set(data?.groups.map((group) => group.hall))];
	const selectedHall = hall !== null && halls.includes(hall) ? hall : null;

	return (
		<div className="flex w-full min-w-0 flex-col gap-7">
			<header className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between">
				<div className="space-y-2">
					<p className="flex items-center gap-2 text-muted-foreground text-sm">
						<MapPin aria-hidden="true" className="size-4" />
						{user.location.site}
					</p>
					<h1 className="font-medium text-2xl">{t(($) => $.medicalTeamDashboard.title)}</h1>
					<p className="max-w-prose text-muted-foreground text-sm">
						{t(($) => $.medicalTeamDashboard.description)}
					</p>
				</div>
				<MedicalPeriodPicker selection={periodSelection} />
			</header>

			<div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
				<div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
					<GroupLevelToggle value={level} onValueChange={setLevel} />
					<ExposureFilterToggle value={exposureFilter} onValueChange={setExposureFilter} />
				</div>
				<HallFilter halls={halls} value={hall} onValueChange={setHall} />
			</div>

			<PeriodAndPrivacyNotice periodSelection={periodSelection} />

			<section aria-labelledby={headingId} className="flex flex-col gap-3">
				<div className="space-y-1">
					<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
						<h2 id={headingId} className="font-semibold">
							{level === "hall"
								? t(($) => $.medicalTeamDashboard.overview.hallsHeading)
								: t(($) => $.medicalTeamDashboard.overview.heading)}
						</h2>
						<OverviewInfoDialog />
					</div>
					<p className="flex max-w-prose items-start gap-1.5 text-muted-foreground text-xs">
						<InfoIcon aria-hidden="true" className="mt-px size-3.5 shrink-0" />
						{t(($) => $.medicalTeamDashboard.overview.aggregationNotice)}
					</p>
					<ThresholdBarLegend />
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
		<EmptyState title={t(($) => $.medicalTeamDashboard.overview.error)} />
	) : groups.length === 0 ? (
		<EmptyState
			title={t(($) => $.medicalTeamDashboard.overview.noGroups.title)}
			description={t(($) => $.medicalTeamDashboard.overview.noGroups.description)}
		/>
	) : groups.every((group) => hasNoValues(group.averages, filter)) ? (
		<EmptyState title={t(($) => $.medicalTeamDashboard.overview.noData)} />
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
		<EmptyState title={t(($) => $.medicalTeamDashboard.overview.hallsError)} />
	) : halls.length === 0 ? (
		<EmptyState
			title={t(($) => $.medicalTeamDashboard.overview.noHalls.title)}
			description={t(($) => $.medicalTeamDashboard.overview.noHalls.description)}
		/>
	) : halls.every((summary) => hasNoValues(summary.averages, filter)) ? (
		<EmptyState title={t(($) => $.medicalTeamDashboard.overview.noData)} />
	) : (
		<HallList halls={halls} units={data.units} filter={filter} />
	);
}

/** Whether none of the filter's exposures has a value, so the cards would only say there's no value */
function hasNoValues(averages: GroupSummary["averages"], filter: ExposureFilter) {
	return getShownExposures(filter).every((exposure) => averages[exposure] === null);
}
