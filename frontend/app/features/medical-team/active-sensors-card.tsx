import { Card } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { activeSensorsQueryOptions } from "./medical-team-queries.ts";
import type { Yard } from "./medical-team-yards.ts";
import { useYardScope } from "./use-yard-scope.ts";

export function ActiveSensorsCard({ yard }: { yard: Yard }) {
	const { t } = useTranslation();

	const scope = useYardScope(yard);

	const { data, isPending, isError } = useQuery(activeSensorsQueryOptions(scope));

	return (
		<Card className="justify-between gap-3">
			<div className="flex items-center justify-between gap-3">
				<h2 className="font-medium text-sm">
					{t(($) => $.medicalTeamDashboard.yardOverview.activeSensors.title)}
				</h2>
				<span className="size-2 shrink-0 rounded-full bg-safe" />
			</div>

			{isPending ? (
				<Skeleton className="h-9 w-20" />
			) : isError ? (
				<p className="text-muted-foreground text-sm">
					{t(($) => $.medicalTeamDashboard.yardOverview.activeSensors.error)}
				</p>
			) : data.activeSensors === null ? (
				<p className="text-muted-foreground text-sm">
					{t(($) => $.medicalTeamDashboard.yardOverview.activeSensors.tooFewPeople)}
				</p>
			) : (
				<p className="font-medium text-4xl tabular-nums leading-none">{data.activeSensors}</p>
			)}
		</Card>
	);
}
