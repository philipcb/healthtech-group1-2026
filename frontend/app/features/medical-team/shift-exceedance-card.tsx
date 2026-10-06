import { DangerLevelPieChart } from "@/components/danger-level-pie-chart.tsx";
import { ExposureIcon } from "@/components/exposure-icon.tsx";
import { Card } from "@/components/ui/card.tsx";
import { type DangerLevel, dangerlevelStyles } from "@/lib/danger-levels.ts";
import { cn } from "@/lib/utils.ts";
import { useTranslation } from "react-i18next";
import type { ShiftExceedanceDto } from "./shift-exceedance-mock-data.ts";

// TODO: The backend should hide small groups when the real endpoint exists, this only guards the frontend
const MIN_GROUP_SIZE = 5;

export function ShiftExceedanceCard({ exceedance }: { exceedance: ShiftExceedanceDto }) {
	const { t } = useTranslation();

	const { exposure, peopleCount, shifts } = exceedance;
	const totalShifts = shifts.safe + shifts.warning + shifts.danger;

	const aboveActionPercent = Math.round(((shifts.warning + shifts.danger) / totalShifts) * 100);
	const aboveLimitPercent = Math.round((shifts.danger / totalShifts) * 100);
	// Safe and above action are complements, so safe is derived from the rounded value to always add up to 100%
	const safePercent = 100 - aboveActionPercent;

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
								safe: safePercent,
								action: aboveActionPercent - aboveLimitPercent,
								limit: aboveLimitPercent,
							})}
							className="size-28 shrink-0"
						>
							<DangerLevelPieChart data={shifts} labels={levelLabels} />
						</div>

						<div className="flex flex-col gap-2">
							<ExceedanceValue
								level="warning"
								label={t(($) => $.medicalTeamDashboard.yardOverview.shiftExceedance.aboveAction)}
								percent={aboveActionPercent}
							/>
							<ExceedanceValue
								level="danger"
								label={t(($) => $.medicalTeamDashboard.yardOverview.shiftExceedance.ofWhichAboveLimit)}
								percent={aboveLimitPercent}
							/>
							<ExceedanceValue
								level="safe"
								label={t(($) => $.medicalTeamDashboard.yardOverview.shiftExceedance.safe)}
								percent={safePercent}
							/>
						</div>
					</div>

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

const valueTextClass: Record<DangerLevel, string> = {
	safe: "text-safe",
	warning: "text-warning",
	danger: "text-danger",
};

function ExceedanceValue({ level, label, percent }: { level: DangerLevel; label: string; percent: number }) {
	return (
		<div className={cn("border-l-4 pl-1.5", dangerlevelStyles[level].border)}>
			<p className="pb-1 text-neutral-500 text-xs dark:text-zinc-400">{label}</p>
			<p className={cn("text-2xl tabular-nums leading-6", valueTextClass[level])}>{`${percent}%`}</p>
		</div>
	);
}
