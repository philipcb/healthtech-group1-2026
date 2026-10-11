import { ExposureIcon } from "@/components/exposure-icon.tsx";
import { Card } from "@/components/ui/card.tsx";
import {
	formatGroupValue,
	getGroupName,
	getOccupationLabel,
	thresholdByExposure,
} from "@/features/medical-team/medical-team-groups.ts";
import type { GroupSummary, GroupSummaryResponse } from "@/features/medical-team/medical-team-queries.ts";
import { ThresholdBar } from "@/features/medical-team/threshold-bar.tsx";
import { getDangerLevel } from "@/lib/danger-levels.ts";
import { type Exposure, exposures } from "@/lib/exposures.ts";
import { ChevronRight, Factory } from "lucide-react";
import { useTranslation } from "react-i18next";
import { href, Link, useLocation } from "react-router";

type GroupListProps = {
	groups: Array<GroupSummary>;
	units: GroupSummaryResponse["units"];
	/** Groups are sorted by their average for this exposure, highest first */
	sort: Exposure;
};

/**
 * One card per group, sorted by the selected exposure. Sorting helps decide where to look closer, it's not a risk
 * ranking: an average says nothing about the spread within a group.
 */
export function GroupList({ groups, units, sort }: GroupListProps) {
	const sortedGroups = groups.toSorted((a, b) => compareGroups(a, b, sort));

	return (
		<ul className="grid gap-4 xl:grid-cols-2">
			{sortedGroups.map((group) => (
				<li key={group.groupId}>
					<GroupCard group={group} units={units} />
				</li>
			))}
		</ul>
	);
}

function GroupCard({ group, units }: { group: GroupSummary; units: GroupSummaryResponse["units"] }) {
	const { t } = useTranslation();

	return (
		<Card variant="labeled" className="h-full rounded-lg">
			<div className="border-b px-4 py-3">
				<p className="flex items-center gap-2 text-muted-foreground text-xs">
					<Factory aria-hidden="true" className="size-3.5" />
					{group.hall}
				</p>
				<h3 className="mt-1 font-semibold">{getOccupationLabel(group.occupation, t)}</h3>
			</div>
			<ul className="flex flex-col gap-1 p-2">
				{exposures.map((exposure) => (
					<li key={exposure}>
						<ExposureLink group={group} exposure={exposure} unit={units[exposure]} />
					</li>
				))}
			</ul>
		</Card>
	);
}

/** The whole row, value and bar included, is one link to the group's details for this exposure */
function ExposureLink({
	group,
	exposure,
	unit,
}: {
	group: GroupSummary;
	exposure: Exposure;
	unit: GroupSummaryResponse["units"][Exposure];
}) {
	const { t } = useTranslation();
	const { search } = useLocation();

	const average = group.averages[exposure];
	const value =
		average === null ? t(($) => $.medicalTeamDashboard.overview.noValue) : formatGroupValue(average, unit, t);
	const threshold = thresholdByExposure[exposure];
	const level = average === null ? null : getDangerLevel(average, threshold.warning, threshold.danger);
	// The level is also written out, so it isn't only shown by the bar's colors
	const levelLabel = level === "warning" || level === "danger" ? t(($) => $.lineChart[level]) : null;

	// Keeps every other selection, so the details show the same period and going back restores the overview
	const searchParams = new URLSearchParams(search);
	searchParams.set("exposure", exposure);

	return (
		<Link
			to={{
				pathname: href("/medical-team/groups/:groupId", { groupId: group.groupId }),
				search: `?${searchParams}`,
			}}
			aria-label={t(($) => $.medicalTeamDashboard.overview.openDetails, {
				exposure: t(($) => $.exposures[exposure]),
				group: getGroupName(group, t),
				value: levelLabel ? `${value}, ${levelLabel.toLowerCase()}` : value,
			})}
			className="flex flex-col gap-1.5 rounded-md p-2 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
		>
			<span className="flex items-center justify-between gap-3 text-sm">
				<span className="flex min-w-0 items-center gap-2">
					<ExposureIcon type={exposure} iconOnly={true} iconClassName="size-4" />
					<span className="font-medium">{t(($) => $.exposures[exposure])}</span>
					<span className="truncate text-muted-foreground text-xs">
						{t(($) => $.medicalTeamDashboard.metricsShort[exposure])}
					</span>
				</span>
				<span className="flex shrink-0 items-center gap-1 tabular-nums">
					{levelLabel && <span className="mr-1 text-muted-foreground text-xs">{levelLabel}</span>}
					{value}
					<ChevronRight aria-hidden="true" className="size-4 text-muted-foreground" />
				</span>
			</span>
			<ThresholdBar value={average} threshold={threshold} />
		</Link>
	);
}

function compareGroups(a: GroupSummary, b: GroupSummary, sort: Exposure) {
	const averageA = a.averages[sort];
	const averageB = b.averages[sort];

	if (averageA === averageB) {
		return a.hall.localeCompare(b.hall) || a.occupation.localeCompare(b.occupation);
	}

	if (averageA === null) {
		return 1;
	}

	if (averageB === null) {
		return -1;
	}

	return averageB - averageA;
}
