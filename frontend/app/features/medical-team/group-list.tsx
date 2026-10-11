import { Card } from "@/components/ui/card.tsx";
import { AverageExposureChart } from "@/features/medical-team/average-exposure-chart.tsx";
import {
	getHallLabel,
	getOccupationLabel,
	type MedicalGroupAggregate,
	type MedicalPeriod,
	type PeriodAggregate,
} from "@/features/medical-team/medical-team-groups.ts";
import { Factory } from "lucide-react";
import { useTranslation } from "react-i18next";

export function GroupList({ groups, period }: { groups: Array<MedicalGroupAggregate>; period: MedicalPeriod }) {
	const { t } = useTranslation();

	if (groups.length === 0) {
		return <EmptyGroupList />;
	}

	return (
		<section aria-label={t(($) => $.medicalTeamDashboard.groupsTitle)} className="grid gap-4 xl:grid-cols-2">
			{groups.map((group) => (
				<GroupCard
					key={group.id}
					hall={group.hall}
					occupation={group.occupation}
					aggregate={group.periods[period]}
				/>
			))}
		</section>
	);
}

function GroupCard({
	hall,
	occupation,
	aggregate,
}: Pick<MedicalGroupAggregate, "hall" | "occupation"> & { aggregate: PeriodAggregate }) {
	const { t } = useTranslation();

	return (
		<Card variant="labeled" className="rounded-lg">
			<div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-3">
				<div>
					<p className="flex items-center gap-2 text-muted-foreground text-xs">
						<Factory aria-hidden="true" className="size-3.5" />
						{getHallLabel(hall, t)}
					</p>
					<h2 className="mt-1 font-semibold">{getOccupationLabel(occupation, t)}</h2>
				</div>
				<div className="min-w-32 rounded-md bg-warning-subtle px-3 py-2 text-right">
					<p className="font-semibold text-lg">
						{aggregate.averageTimeAboveActionPercent}
						{"%"}
					</p>
					<p className="text-muted-foreground text-xs">
						{t(($) => $.medicalTeamDashboard.averageTimeAboveAction)}
					</p>
				</div>
			</div>
			<AverageExposureChart averageValues={aggregate.averageValues} />
		</Card>
	);
}

function EmptyGroupList() {
	const { t } = useTranslation();

	return (
		<div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center">
			<p className="font-medium">{t(($) => $.medicalTeamDashboard.empty.title)}</p>
			<p className="max-w-sm text-muted-foreground text-sm">
				{t(($) => $.medicalTeamDashboard.empty.description)}
			</p>
		</div>
	);
}
