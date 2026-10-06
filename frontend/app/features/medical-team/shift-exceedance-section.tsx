import { Card } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { exposures } from "@/lib/exposures.ts";
import { useQuery } from "@tanstack/react-query";
import { useQueryStates } from "nuqs";
import { useTranslation } from "react-i18next";
import { LevelClassificationDialog } from "./level-classification-dialog.tsx";
import type { Yard } from "./medical-team-yards.ts";
import { ShiftExceedanceCard } from "./shift-exceedance-card.tsx";
import { shiftExceedanceQueryOptions } from "./shift-exceedance-query.ts";
import { getPeriodRange, yardFilterParsers } from "./yard-filter-parsers.ts";

export function ShiftExceedanceSection({ yard }: { yard: Yard }) {
	const { t } = useTranslation();

	const [{ hall: hallParam, period }] = useQueryStates(yardFilterParsers);
	const hall = yard.halls.find((h) => h === hallParam) ?? null;
	const { start, end } = getPeriodRange(period);

	const { data, isPending, isError } = useQuery(
		shiftExceedanceQueryOptions({ yardId: yard.id, halls: yard.halls, hall, start, end }),
	);

	return (
		<section className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h2 className="font-medium text-lg">
					{t(($) => $.medicalTeamDashboard.yardOverview.shiftExceedance.title)}
				</h2>
				<LevelClassificationDialog />
			</div>

			{isPending ? (
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					{exposures.map((exposure) => (
						<Skeleton key={exposure} className="h-36 rounded-xl" />
					))}
				</div>
			) : isError ? (
				<Card>
					<p className="text-muted-foreground text-sm">
						{t(($) => $.medicalTeamDashboard.yardOverview.shiftExceedance.error)}
					</p>
				</Card>
			) : (
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					{exposures.map((exposure) => {
						const exceedance = data.find((row) => row.exposure === exposure);

						return exceedance && <ShiftExceedanceCard key={exposure} exceedance={exceedance} />;
					})}
				</div>
			)}
		</section>
	);
}
