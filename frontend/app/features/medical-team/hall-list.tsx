import { SummaryCard } from "@/features/medical-team/group-list.tsx";
import {
	compareByExposureFilter,
	type ExposureFilter,
	getHallName,
	getShownExposures,
} from "@/features/medical-team/medical-team-groups.ts";
import type { HallSummary, HallSummaryResponse } from "@/features/medical-team/queries/medical-team-contracts.ts";
import { Factory } from "lucide-react";
import { useTranslation } from "react-i18next";

type HallListProps = {
	halls: Array<HallSummary>;
	units: HallSummaryResponse["units"];
	/** The exposures every card shows, and how halls are sorted, the same way as groups */
	filter: ExposureFilter;
};

/** One card per whole hall. Demo only, see `HallSummary`. */
export function HallList({ halls, units, filter }: HallListProps) {
	const { t } = useTranslation();
	const sortedHalls = halls.toSorted(
		(a, b) => compareByExposureFilter(a.averages, b.averages, filter) || a.hall.localeCompare(b.hall),
	);

	return (
		<ul className="grid gap-4 xl:grid-cols-2">
			{sortedHalls.map((hall) => (
				<li key={hall.groupId}>
					<SummaryCard
						header={
							<>
								<h3 className="flex items-center gap-2 font-semibold">
									<Factory aria-hidden="true" className="size-4 text-muted-foreground" />
									{hall.hall}
								</h3>
								<p className="mt-1 text-muted-foreground text-xs">
									{t(($) => $.medicalTeamDashboard.wholeHall)}
								</p>
							</>
						}
						groupId={hall.groupId}
						name={getHallName(hall.hall, t)}
						averages={hall.averages}
						units={units}
						shownExposures={getShownExposures(filter)}
					/>
				</li>
			))}
		</ul>
	);
}
