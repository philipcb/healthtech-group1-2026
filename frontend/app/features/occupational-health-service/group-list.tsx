import {
	compareByExposureFilter,
	type ExposureFilter,
	getGroupName,
	getOccupationLabel,
	getShownExposures,
} from "@/features/occupational-health-service/occupational-health-service-groups.ts";
import type {
	GroupSummary,
	GroupSummaryResponse,
} from "@/features/occupational-health-service/queries/occupational-health-service-contracts.ts";
import { SummaryCard } from "@/features/occupational-health-service/summary-card.tsx";
import { Factory } from "lucide-react";
import { useTranslation } from "react-i18next";

type GroupListProps = {
	groups: Array<GroupSummary>;
	units: GroupSummaryResponse["units"];
	/** The exposures every card shows. With one exposure, groups are sorted by their average for it, highest first. */
	filter: ExposureFilter;
};

/**
 * One card per group, sorted by the selected exposure. Sorting helps decide where to look closer, it's not a risk
 * ranking: an average says nothing about the spread within a group.
 */
export function GroupList({ groups, units, filter }: GroupListProps) {
	const { t } = useTranslation();
	const sortedGroups = groups.toSorted((a, b) => compareGroups(a, b, filter));

	return (
		<ul className="grid grid-cols-1 gap-4 xl:grid-cols-2">
			{sortedGroups.map((group) => (
				<li key={group.groupId}>
					<SummaryCard
						header={
							<>
								<p className="flex items-center gap-2 text-muted-foreground text-xs">
									<Factory aria-hidden="true" className="size-3.5" />
									{group.hall}
								</p>
								<h3 className="mt-1 font-semibold">{getOccupationLabel(group.occupation, t)}</h3>
							</>
						}
						groupId={group.groupId}
						name={getGroupName(group, t)}
						averages={group.averages}
						units={units}
						shownExposures={getShownExposures(filter)}
					/>
				</li>
			))}
		</ul>
	);
}

function compareGroups(a: GroupSummary, b: GroupSummary, filter: ExposureFilter) {
	return (
		compareByExposureFilter(a.averages, b.averages, filter) ||
		a.hall.localeCompare(b.hall) ||
		a.occupation.localeCompare(b.occupation)
	);
}
