import { Skeleton } from "@/components/ui/skeleton.tsx";
import { EmptyState } from "@/features/medical-team/empty-state.tsx";
import { GroupList } from "@/features/medical-team/group-list.tsx";
import { HallFilter } from "@/features/medical-team/hall-filter.tsx";
import { MedicalExposureToggle } from "@/features/medical-team/medical-exposure-toggle.tsx";
import { MedicalPeriodPicker } from "@/features/medical-team/medical-period-picker.tsx";
import { PeriodAndPrivacyNotice } from "@/features/medical-team/medical-team-notices.tsx";
import { groupSummariesQueryOptions } from "@/features/medical-team/medical-team-queries.ts";
import { useMedicalTeamSearchParams } from "@/features/medical-team/medical-team-search-params.ts";
import { OverviewInfoDialog } from "@/features/medical-team/overview-info-dialog.tsx";
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
	const { sort, setSort, hall, setHall, periodSelection } = useMedicalTeamSearchParams();
	const { period, month, year } = periodSelection;
	const { data, isPending, isError } = useQuery(
		groupSummariesQueryOptions({ site: user.location.site, period, month, year }),
	);

	const halls = [...new Set(data?.groups.map((group) => group.hall))];
	const isHallSelected = hall !== null && halls.includes(hall);
	const groups = data?.groups.filter((group) => !isHallSelected || group.hall === hall) ?? [];

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

			<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
				<MedicalExposureToggle
					label={t(($) => $.medicalTeamDashboard.overview.sortLabel)}
					value={sort}
					onValueChange={setSort}
				/>
				<HallFilter halls={halls} value={hall} onValueChange={setHall} />
			</div>

			<PeriodAndPrivacyNotice periodSelection={periodSelection} />

			<section aria-labelledby={headingId} className="flex flex-col gap-3">
				<div className="space-y-1">
					<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
						<h2 id={headingId} className="font-semibold">
							{t(($) => $.medicalTeamDashboard.overview.heading)}
						</h2>
						<OverviewInfoDialog />
					</div>
					<p className="flex max-w-prose items-start gap-1.5 text-muted-foreground text-xs">
						<InfoIcon aria-hidden="true" className="mt-px size-3.5 shrink-0" />
						{t(($) => $.medicalTeamDashboard.overview.aggregationNotice)}
					</p>
					<ThresholdBarLegend />
				</div>

				{isPending ? (
					<Skeleton className="h-64 w-full" />
				) : isError ? (
					<EmptyState title={t(($) => $.medicalTeamDashboard.overview.error)} />
				) : groups.length === 0 ? (
					<EmptyState
						title={t(($) => $.medicalTeamDashboard.overview.noGroups.title)}
						description={t(($) => $.medicalTeamDashboard.overview.noGroups.description)}
					/>
				) : groups.every((group) => Object.values(group.averages).every((average) => average === null)) ? (
					<EmptyState title={t(($) => $.medicalTeamDashboard.overview.noData)} />
				) : (
					<GroupList groups={groups} units={data.units} sort={sort} />
				)}
			</section>
		</div>
	);
}
