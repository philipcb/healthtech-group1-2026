import { Card } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { useTranslation } from "react-i18next";
import { activePeopleQueryOptions } from "./active-people-query.ts";
import type { Yard } from "./medical-team-yards.ts";
import { getPeriodRange, yardFilterParsers } from "./yard-filter-parsers.ts";

export function ActivePeopleCard({ yard }: { yard: Yard }) {
	const { t } = useTranslation();

	const [{ hall: hallParam, period }] = useQueryStates(yardFilterParsers);
	const hall = yard.halls.find((h) => h === hallParam) ?? null;
	const { start, end } = getPeriodRange(period);

	const { data, isPending, isError } = useQuery(
		activePeopleQueryOptions({ yardId: yard.id, halls: yard.halls, hall, start, end }),
	);

	return (
		<Card className="justify-between gap-3">
			<h2 className="font-medium text-sm">{t(($) => $.medicalTeamDashboard.yardOverview.activePeople.title)}</h2>

			{isPending ? (
				<Skeleton className="h-9 w-20" />
			) : isError ? (
				<p className="text-muted-foreground text-sm">
					{t(($) => $.medicalTeamDashboard.yardOverview.activePeople.error)}
				</p>
			) : data.activePeople === null ? (
				<p className="text-muted-foreground text-sm">
					{t(($) => $.medicalTeamDashboard.yardOverview.activePeople.tooFewPeople)}
				</p>
			) : (
				<p className="font-medium text-4xl tabular-nums leading-none">{data.activePeople}</p>
			)}
		</Card>
	);
}
