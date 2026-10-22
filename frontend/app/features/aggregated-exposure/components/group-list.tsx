import { SummaryCard } from "@/features/aggregated-exposure/components/summary-card.tsx";
import {
	compareByExposureFilter,
	type ExposureFilter,
	type GroupSummary,
	getGroupName,
	getOccupationLabel,
	getShownExposures,
} from "@/features/aggregated-exposure/model/groups.ts";
import type { MeasurementUnitsDto } from "@/lib/api/generated/models/index.ts";
import { Factory } from "lucide-react";
import { useTranslation } from "react-i18next";

type GroupListProps = {
	groups: Array<GroupSummary>;
	units: MeasurementUnitsDto;
	filter: ExposureFilter;
	showsYard: boolean;
};

export function GroupList({ groups, units, filter, showsYard }: GroupListProps) {
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
									{showsYard ? `${group.site} · ${group.hall}` : group.hall}
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
		a.site.localeCompare(b.site) ||
		a.hall.localeCompare(b.hall) ||
		a.occupation.localeCompare(b.occupation)
	);
}
