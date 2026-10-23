import { SummaryCard } from "@/features/aggregated-exposure/components/summary-card.tsx";
import {
	compareByExposureFilter,
	type ExposureFilter,
	getHallName,
	getShownExposures,
	type HallSummary,
} from "@/features/aggregated-exposure/model/groups.ts";
import type { MeasurementUnitsDto } from "@/lib/api/generated/models/index.ts";
import { Factory } from "lucide-react";
import { useTranslation } from "react-i18next";

type HallListProps = {
	halls: Array<HallSummary>;
	units: MeasurementUnitsDto;
	filter: ExposureFilter;
	showsYard: boolean;
};

export function HallList({ halls, units, filter, showsYard }: HallListProps) {
	const { t } = useTranslation();
	const sortedHalls = halls.toSorted(
		(a, b) =>
			compareByExposureFilter(a.averages, b.averages, filter) ||
			a.site.localeCompare(b.site) ||
			a.hall.localeCompare(b.hall),
	);

	return (
		<ul className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
									{showsYard
										? `${hall.site} · ${t(($) => $.aggregatedExposure.wholeHall)}`
										: t(($) => $.aggregatedExposure.wholeHall)}
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
