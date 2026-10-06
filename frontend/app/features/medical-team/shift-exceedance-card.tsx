import { DangerLevelPieChart } from "@/components/danger-level-pie-chart.tsx";
import { ExposureIcon } from "@/components/exposure-icon.tsx";
import { Card } from "@/components/ui/card.tsx";
import { DANGER_LEVEL_SEVERITY, type DangerLevel, DangerLevelSchema, dangerlevelStyles } from "@/lib/danger-levels.ts";
import { cn } from "@/lib/utils.ts";
import { UsersIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ShiftExceedanceDto } from "./shift-exceedance-mock-data.ts";

// TODO: The backend should hide small groups when the real endpoint exists, this only guards the frontend
const MIN_GROUP_SIZE = 5;

export function ShiftExceedanceCard({ exceedance }: { exceedance: ShiftExceedanceDto }) {
	const { t } = useTranslation();

	const { exposure, peopleCount, shifts, peopleAboveAction } = exceedance;
	const totalShifts = shifts.safe + shifts.warning + shifts.danger;

	const levelLabels: Record<DangerLevel, string> = {
		safe: t(($) => $.medicalTeamDashboard.yardOverview.shiftExceedance.safe),
		warning: t(($) => $.medicalTeamDashboard.yardOverview.shiftExceedance.betweenActionAndLimit),
		danger: t(($) => $.medicalTeamDashboard.yardOverview.shiftExceedance.aboveLimit),
	};

	return (
		<Card className="gap-3">
			<h3 className="flex items-center gap-3 text-sm uppercase tracking-wide">
				<ExposureIcon type={exposure} size="sm" />
				{t(($) => $.exposures[exposure])}
			</h3>

			{peopleCount < MIN_GROUP_SIZE ? (
				<p className="text-muted-foreground text-sm">
					{t(($) => $.medicalTeamDashboard.yardOverview.shiftExceedance.tooFewPeople)}
				</p>
			) : totalShifts === 0 ? (
				<p className="text-muted-foreground text-sm">
					{t(($) => $.medicalTeamDashboard.yardOverview.shiftExceedance.noShifts)}
				</p>
			) : (
				<>
					<div className="grid grid-cols-[auto_1fr] items-center gap-4">
						<div
							role="img"
							aria-label={t(($) => $.medicalTeamDashboard.yardOverview.shiftExceedance.distribution, {
								limit: shifts.danger,
								action: shifts.warning,
								safe: shifts.safe,
							})}
							className="size-28 shrink-0"
						>
							<DangerLevelPieChart data={shifts} labels={levelLabels} />
						</div>

						<div className="flex flex-col gap-2">
							{severityOrder.map((level) => (
								<ExceedanceValue
									key={level}
									level={level}
									label={levelLabels[level]}
									count={shifts[level]}
								/>
							))}
						</div>
					</div>

					{peopleAboveAction && (
						<p className="flex items-center gap-2 border-t pt-3 text-sm">
							<UsersIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
							{t(($) => $.medicalTeamDashboard.yardOverview.shiftExceedance.repeatedExceedances, {
								count: peopleAboveAction.atLeastN,
								n: peopleAboveAction.n,
							})}
						</p>
					)}

					<p className="text-muted-foreground text-xs">
						{t(($) => $.medicalTeamDashboard.yardOverview.shiftExceedance.shiftsAndPeople, {
							shifts: totalShifts,
							people: peopleCount,
						})}
					</p>
				</>
			)}
		</Card>
	);
}

/** Most severe first, the same order as the foreman's pie chart cards */
const severityOrder = DangerLevelSchema.options.toSorted((a, b) => DANGER_LEVEL_SEVERITY[b] - DANGER_LEVEL_SEVERITY[a]);

function ExceedanceValue({ level, label, count }: { level: DangerLevel; label: string; count: number }) {
	return (
		<div className={cn("border-l-4 pl-1.5", dangerlevelStyles[level].border)}>
			<p className="pb-1 text-neutral-500 text-xs dark:text-zinc-400">{label}</p>
			<p className="text-2xl tabular-nums leading-6">{count}</p>
		</div>
	);
}
