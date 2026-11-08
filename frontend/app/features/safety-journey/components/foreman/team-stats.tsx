import { Progress } from "@/components/ui/progress.tsx";
import { COLORS } from "@/features/safety-journey/model/colors.ts";
import type { TeamSummary } from "@/features/safety-journey/model/types.ts";
import { useTranslation } from "react-i18next";

function StatTile({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
	return (
		<div className="flex flex-col gap-1 rounded-lg border bg-card p-4">
			<p className="text-muted-foreground text-sm">{label}</p>
			<p className="font-bold text-2xl tabular-nums">{value}</p>
			{children}
		</div>
	);
}

/** Team totals for this week; never any individual operator's numbers */
export function TeamStats({ team }: { team: TeamSummary }) {
	const { t } = useTranslation();

	return (
		<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
			<StatTile label={t(($) => $.safetyJourney.team.teamPoints)} value={team.teamPoints.toLocaleString()}>
				<p className="text-muted-foreground text-xs">
					{t(($) => $.safetyJourney.team.perOperator, {
						points: Math.round(team.teamPoints / team.operatorCount),
					})}
				</p>
			</StatTile>
			<StatTile
				label={t(($) => $.safetyJourney.team.takingPart)}
				value={t(($) => $.safetyJourney.common.ofTotal, {
					value: team.activeOperators,
					total: team.operatorCount,
				})}
			>
				<p className="text-muted-foreground text-xs">{t(($) => $.safetyJourney.team.takingPartInfo)}</p>
			</StatTile>
			<StatTile
				label={t(($) => $.safetyJourney.team.cleanShifts)}
				value={t(($) => $.safetyJourney.common.fraction, {
					value: team.cleanShifts,
					total: team.plannedShifts,
				})}
			>
				<Progress
					value={(team.cleanShifts / team.plannedShifts) * 100}
					className="mt-1 h-1 bg-muted [&>*]:bg-(--bar-color)"
					style={{ "--bar-color": COLORS.teal } as React.CSSProperties}
				/>
			</StatTile>
			<StatTile
				label={t(($) => $.safetyJourney.team.alertsAnswered)}
				value={t(($) => $.safetyJourney.common.ofTotal, {
					value: team.alertsAnswered,
					total: team.alertsTotal,
				})}
			>
				<p className="text-muted-foreground text-xs">{t(($) => $.safetyJourney.team.alertsAnsweredInfo)}</p>
			</StatTile>
		</div>
	);
}
