import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { BadgeEmblem } from "@/features/safety-journey/components/shared/badge-emblem.tsx";
import { BADGES, isUnlocked } from "@/features/safety-journey/model/badges.ts";
import type { BadgeProgress } from "@/features/safety-journey/model/types.ts";
import { cn } from "@/lib/utils.ts";
import { useTranslation } from "react-i18next";

export function BadgeGrid({ progress }: { progress: ReadonlyArray<BadgeProgress> }) {
	const { t } = useTranslation();

	return (
		<div className="grid grid-cols-3 gap-1">
			{BADGES.map((badge) => {
				const value = progress.find((p) => p.key === badge.key)?.progress ?? 0;
				const unlocked = isUnlocked(badge, { key: badge.key, progress: value });
				const name = t(($) => $.safetyJourney.badges.names[badge.key]);
				const info = t(($) => $.safetyJourney.badges.info[badge.key], { target: badge.target });

				return (
					<Popover key={badge.key}>
						<PopoverTrigger
							aria-label={name}
							className={cn(
								"flex cursor-pointer flex-col items-center gap-0.5 rounded-md p-2 text-center text-xs leading-tight hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
								!unlocked && "text-muted-foreground",
							)}
						>
							<BadgeEmblem {...badge} locked={!unlocked} className="mb-1 size-12" />
							<span className="font-medium">{name}</span>
							<span className="text-muted-foreground">
								{unlocked
									? info
									: t(($) => $.safetyJourney.badges.progress, {
											progress: value,
											target: badge.target,
										})}
							</span>
						</PopoverTrigger>
						<PopoverContent className="w-60 space-y-1 text-sm">
							<p className="font-medium">{name}</p>
							<p>{info}</p>
							<p className="text-muted-foreground">
								{unlocked
									? t(($) => $.safetyJourney.badges.earned)
									: t(($) => $.safetyJourney.badges.progress, {
											progress: value,
											target: badge.target,
										})}
							</p>
						</PopoverContent>
					</Popover>
				);
			})}
		</div>
	);
}
