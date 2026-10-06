import { Card } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { useTranslation } from "react-i18next";
import { activeSensorsQueryOptions } from "./active-sensors-query.ts";
import type { Yard } from "./medical-team-yards.ts";
import { getPeriodRange, yardFilterParsers } from "./yard-filter-parsers.ts";

export function ActiveSensorsCard({ yard }: { yard: Yard }) {
	const { t } = useTranslation();

	const [{ hall: hallParam, period }] = useQueryStates(yardFilterParsers);
	const hall = yard.halls.find((h) => h === hallParam) ?? null;
	const { start, end } = getPeriodRange(period);

	const { data, isPending, isError } = useQuery(
		activeSensorsQueryOptions({ yardId: yard.id, halls: yard.halls, hall, start, end }),
	);

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
			) : (
				<p className="font-medium text-4xl tabular-nums leading-none">{data.activeSensors}</p>
			)}
		</Card>
	);
}
