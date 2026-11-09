import { Badge } from "@/components/ui/badge.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { COLORS } from "@/features/safety-journey/model/colors.ts";
import { operatorMock } from "@/features/safety-journey/model/mock-data.ts";
import { getLevelProgress, LEVELS } from "@/features/safety-journey/model/rules.ts";
import { useSafetyJourney } from "@/features/safety-journey/state/use-safety-journey.ts";
import { cn } from "@/lib/utils.ts";
import { ChevronDown, Flame } from "lucide-react";
import { useTranslation } from "react-i18next";

export function LevelProgress() {
	const { t } = useTranslation();
	const { lifetimePoints } = useSafetyJourney();
	const { index, next, percent, pointsToNext } = getLevelProgress(lifetimePoints);

	const levelLabel = (i: number) =>
		t(($) => $.safetyJourney.levels.levelWithName, {
			number: i + 1,
			name: t(($) => $.safetyJourney.levels.names[LEVELS[i].key]),
		});

	return (
		<section className="space-y-2">
			<div className="flex items-center justify-between gap-2">
				<div className="flex flex-wrap items-baseline gap-x-3">
					<Popover>
						<PopoverTrigger className="flex cursor-pointer items-center gap-1 rounded-sm font-semibold text-lg hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
							{levelLabel(index)}
							<ChevronDown className="size-4" aria-hidden={true} />
						</PopoverTrigger>
						<PopoverContent align="start" className="w-64 p-2">
							<ul className="text-sm">
								{LEVELS.map((level, i) => (
									<li
										key={level.key}
										className={cn(
											"flex justify-between rounded-sm px-2 py-1",
											i === index && "bg-accent font-medium",
										)}
									>
										<span>{levelLabel(i)}</span>
										<span className="text-muted-foreground tabular-nums">{level.minPoints}</span>
									</li>
								))}
							</ul>
						</PopoverContent>
					</Popover>
					<span className="font-medium text-sm" style={{ color: COLORS.gold }}>
						{t(($) => $.safetyJourney.levels.lifetimePoints, { points: lifetimePoints })}
					</span>
				</div>

				<Tooltip>
					<TooltipTrigger asChild={true}>
						<Badge variant="outline" tabIndex={0}>
							<Flame style={{ color: COLORS.plum }} aria-hidden={true} />
							{t(($) => $.safetyJourney.levels.streak, { days: operatorMock.streakDays })}
						</Badge>
					</TooltipTrigger>
					<TooltipContent>{t(($) => $.safetyJourney.levels.streakExplanation)}</TooltipContent>
				</Tooltip>
			</div>
			<Progress
				value={percent}
				className="h-1.5 bg-muted [&>*]:bg-(--bar-color)"
				style={{ "--bar-color": COLORS.teal } as React.CSSProperties}
			/>
			<p className="text-muted-foreground text-sm">
				{next
					? t(($) => $.safetyJourney.levels.pointsToNext, {
							points: pointsToNext,
							level: levelLabel(index + 1),
						})
					: t(($) => $.safetyJourney.levels.maxLevel)}
			</p>
		</section>
	);
}
