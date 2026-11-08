import { DAILY_POINT_CAP, EARN_RULES, WEEKLY_CHALLENGE_TARGET } from "@/features/safety-journey/model/rules.ts";
import { useTranslation } from "react-i18next";

/** How points are earned, with the limits per day/week and the daily cap */
export function EarnRules() {
	const { t } = useTranslation();

	return (
		<div className="flex flex-col gap-1.5 text-sm">
			<ul className="flex flex-col gap-1.5">
				{EARN_RULES.map((rule) => (
					<li key={rule.key} className="flex justify-between gap-4">
						<span>
							{t(($) => $.safetyJourney.rules.names[rule.key], { target: WEEKLY_CHALLENGE_TARGET })}
						</span>
						<span className="shrink-0 text-muted-foreground">
							{t(($) => $.safetyJourney.rules.limit[rule.limit.per], {
								points: rule.points,
								count: rule.limit.count,
							})}
						</span>
					</li>
				))}
			</ul>
			<div className="flex justify-between gap-4 border-t pt-1.5 font-semibold">
				<span>{t(($) => $.safetyJourney.rules.maxPerDay)}</span>
				<span>{t(($) => $.safetyJourney.rules.maxPerDayValue, { points: DAILY_POINT_CAP })}</span>
			</div>
			<p className="text-muted-foreground text-xs">{t(($) => $.safetyJourney.rules.bonusOnTop)}</p>
		</div>
	);
}
