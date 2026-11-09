import { Progress } from "@/components/ui/progress.tsx";
import { BadgeEmblem } from "@/features/safety-journey/components/shared/badge-emblem.tsx";
import { TEAM_BADGE } from "@/features/safety-journey/model/badges.ts";
import { cn } from "@/lib/utils.ts";
import { useTranslation } from "react-i18next";

type TeamBadgeCardProps = {
	cleanShifts: number;
	/** Compact row in the operator dialog, or a large centred card on the foreman page */
	size?: "compact" | "large";
	className?: string;
};

export function TeamBadgeCard({ cleanShifts, size = "compact", className }: TeamBadgeCardProps) {
	const { t } = useTranslation();
	const { target } = TEAM_BADGE;
	const earned = cleanShifts >= target;
	const large = size === "large";

	return (
		<section
			className={cn(
				"flex gap-4 rounded-lg border p-3",
				large ? "flex-col items-center justify-center p-6 text-center" : "items-center",
				className,
			)}
		>
			{large && (
				<p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
					{t(($) => $.safetyJourney.badges.team.label)}
				</p>
			)}
			<BadgeEmblem {...TEAM_BADGE} className={cn("shrink-0", large ? "size-28" : "size-16")} />
			<div className={cn("flex w-full flex-1 flex-col gap-1.5", large && "max-w-xs items-center")}>
				{!large && (
					<p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
						{t(($) => $.safetyJourney.badges.team.label)}
					</p>
				)}
				<p className={cn("font-semibold", large && "text-lg")}>
					{large
						? t(($) => $.safetyJourney.badges.team.fullName)
						: t(($) => $.safetyJourney.badges.team.name)}
				</p>
				{large && (
					<p className="text-muted-foreground text-sm">
						{t(($) => $.safetyJourney.badges.team.info, { target })}
					</p>
				)}
				<Progress
					value={Math.min(100, (cleanShifts / target) * 100)}
					className="h-1.5 w-full bg-muted [&>*]:bg-(--bar-color)"
					style={{ "--bar-color": TEAM_BADGE.color } as React.CSSProperties}
				/>
				<p className="text-muted-foreground text-sm">
					{t(($) => $.safetyJourney.badges.team.progress, { progress: cleanShifts, target })}
				</p>
				{large && (
					<p className="font-medium text-sm">
						{earned
							? t(($) => $.safetyJourney.badges.team.earned)
							: t(($) => $.safetyJourney.badges.team.remaining, { count: target - cleanShifts })}
					</p>
				)}
			</div>
		</section>
	);
}
