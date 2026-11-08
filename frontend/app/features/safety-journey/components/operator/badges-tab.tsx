import { Progress } from "@/components/ui/progress.tsx";
import { BadgeGrid } from "@/features/safety-journey/components/operator/badge-grid.tsx";
import { BadgeEmblem } from "@/features/safety-journey/components/shared/badge-emblem.tsx";
import { TeamBadgeCard } from "@/features/safety-journey/components/shared/team-badge-card.tsx";
import { getClosestBadge } from "@/features/safety-journey/model/badges.ts";
import { operatorMock, teamMock } from "@/features/safety-journey/model/mock-data.ts";
import { useTranslation } from "react-i18next";

export function BadgesTab() {
	const { t } = useTranslation();
	const closest = getClosestBadge(operatorMock.badges);

	return (
		<div className="flex flex-col gap-4">
			<TeamBadgeCard cleanShifts={teamMock.cleanShifts} />

			{closest && (
				<section className="flex items-center gap-4 rounded-lg border p-3">
					<BadgeEmblem {...closest.badge} className="size-16 shrink-0" />
					<div className="flex flex-1 flex-col gap-1.5">
						<p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
							{t(($) => $.safetyJourney.badges.closest)}
						</p>
						<p className="font-semibold">{t(($) => $.safetyJourney.badges.names[closest.badge.key])}</p>
						<Progress
							value={(closest.progress / closest.badge.target) * 100}
							className="h-1.5 bg-muted [&>*]:bg-(--bar-color)"
							style={{ "--bar-color": closest.badge.color } as React.CSSProperties}
						/>
						<p className="text-muted-foreground text-sm">
							{t(($) => $.safetyJourney.badges.nextStep[closest.badge.key], {
								count: closest.badge.target - closest.progress,
							})}
						</p>
					</div>
				</section>
			)}

			<section className="flex flex-col gap-2">
				<h3 className="font-semibold text-sm">{t(($) => $.safetyJourney.badges.yours)}</h3>
				<BadgeGrid progress={operatorMock.badges} />
			</section>
		</div>
	);
}
