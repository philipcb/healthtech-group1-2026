import { Progress } from "@/components/ui/progress.tsx";
import { COLORS } from "@/features/safety-journey/model/colors.ts";
import { DAILY_POINT_CAP } from "@/features/safety-journey/model/rules.ts";
import { useSafetyJourney } from "@/features/safety-journey/state/use-safety-journey.ts";
import { useTranslation } from "react-i18next";

/** Points earned today against the daily cap, so it's clear why points stop at some point */
export function TodayCard() {
	const { t } = useTranslation();
	const { todayEvents, todayPoints } = useSafetyJourney();

	return (
		<section className="flex flex-col gap-2 rounded-lg border p-3">
			<div className="flex items-baseline justify-between">
				<h3 className="font-semibold text-sm">{t(($) => $.safetyJourney.overview.today)}</h3>
				<span className="text-muted-foreground text-sm tabular-nums">
					{t(($) => $.safetyJourney.overview.todayProgress, { points: todayPoints, max: DAILY_POINT_CAP })}
				</span>
			</div>
			<Progress
				value={(todayPoints / DAILY_POINT_CAP) * 100}
				className="h-1.5 bg-muted [&>*]:bg-(--bar-color)"
				style={{ "--bar-color": COLORS.indigo } as React.CSSProperties}
			/>
			{todayEvents.length ? (
				<ul className="flex flex-col gap-1.5 text-sm">
					{todayEvents.map((event) => (
						<li key={`${event.rule}-${event.time}`} className="flex justify-between gap-3">
							<span>
								{t(($) => $.safetyJourney.events[event.rule])}
								<span className="ml-2 text-muted-foreground text-xs tabular-nums">{event.time}</span>
							</span>
							<span className="font-medium tabular-nums">
								{t(($) => $.safetyJourney.common.pointsDelta, { points: event.points })}
							</span>
						</li>
					))}
				</ul>
			) : (
				<p className="text-muted-foreground text-sm">{t(($) => $.safetyJourney.overview.nothingToday)}</p>
			)}
		</section>
	);
}
