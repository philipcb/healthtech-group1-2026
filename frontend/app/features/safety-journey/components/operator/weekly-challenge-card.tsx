import { COLORS, tint } from "@/features/safety-journey/model/colors.ts";
import { operatorMock } from "@/features/safety-journey/model/mock-data.ts";
import { getRule, WEEKLY_CHALLENGE_TARGET } from "@/features/safety-journey/model/rules.ts";
import type { Weekday } from "@/features/safety-journey/model/types.ts";
import { cn } from "@/lib/utils.ts";
import { Check, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";

function DayDot({ day }: { day: Weekday }) {
	const { t } = useTranslation();
	const label = t(($) => $.safetyJourney.overview.dayStatus[day.status]);

	return (
		<div className="flex flex-col items-center gap-1">
			<span
				role="img"
				aria-label={label}
				title={label}
				className={cn(
					"flex size-7 items-center justify-center rounded-full",
					day.status === "clean" ? "text-white" : "bg-muted text-muted-foreground",
				)}
				style={day.status === "clean" ? { backgroundColor: COLORS.teal } : undefined}
			>
				{day.status === "clean" && <Check className="size-3.5" strokeWidth={3} aria-hidden={true} />}
				{day.status === "missed" && <Minus className="size-3.5" aria-hidden={true} />}
			</span>
			<span className={cn("text-xs", day.isToday ? "font-semibold" : "text-muted-foreground")}>
				{day.isToday ? t(($) => $.safetyJourney.common.today) : t(($) => $.safetyJourney.common.days[day.day])}
			</span>
		</div>
	);
}

/** Clean shifts this week towards the bonus; one missed day doesn't break it */
export function WeeklyChallengeCard() {
	const { t } = useTranslation();
	const { week } = operatorMock;
	const done = week.filter((d) => d.status === "clean").length;
	const bonus = getRule("weeklyChallenge").points;

	return (
		<section className="flex flex-col gap-2.5 rounded-lg border p-3">
			<div className="flex items-start justify-between gap-2">
				<div>
					<p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
						{t(($) => $.safetyJourney.overview.weeklyChallenge)}
					</p>
					<h3 className="font-semibold text-sm">
						{t(($) => $.safetyJourney.overview.weeklyTitle, { target: WEEKLY_CHALLENGE_TARGET })}
					</h3>
				</div>
				<span
					className="shrink-0 rounded-full px-2.5 py-0.5 font-semibold text-xs"
					style={{ backgroundColor: tint(COLORS.gold), color: COLORS.gold }}
				>
					{t(($) => $.safetyJourney.overview.weeklyBonus, { points: bonus })}
				</span>
			</div>
			<div className="grid grid-cols-5 gap-2">
				{week.map((day) => (
					<DayDot key={day.day} day={day} />
				))}
			</div>
			<p className="text-muted-foreground text-xs">
				{done >= WEEKLY_CHALLENGE_TARGET
					? t(($) => $.safetyJourney.overview.weeklyDone)
					: t(($) => $.safetyJourney.overview.weeklyProgress, { done, target: WEEKLY_CHALLENGE_TARGET })}
			</p>
		</section>
	);
}
