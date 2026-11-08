import { ExposureIcon } from "@/components/exposure-icon.tsx";
import { Button } from "@/components/ui/button.tsx";
import { COLORS, tint } from "@/features/safety-journey/model/colors.ts";
import { RECOVERY_OPTIONS } from "@/features/safety-journey/model/recovery-options.ts";
import { getRule } from "@/features/safety-journey/model/rules.ts";
import type { RecoveryOptionKey } from "@/features/safety-journey/model/types.ts";
import { useSafetyJourney } from "@/features/safety-journey/state/use-safety-journey.ts";
import type { Exposure } from "@/lib/exposures.ts";
import { Check, Coffee, Ellipsis, Footprints, Headphones, type LucideIcon, Repeat, Wind, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";

const OPTION_ICONS: Record<RecoveryOptionKey, LucideIcon> = {
	changedTool: Wrench,
	changedTask: Repeat,
	tookBreak: Coffee,
	hearingProtection: Headphones,
	movedAway: Footprints,
	usedRespirator: Wind,
	somethingElse: Ellipsis,
};

/** The preset answers for an exposure as a 2×2 grid of buttons; one tap answers */
export function RecoveryOptionButtons({ exposure }: { exposure: Exposure }) {
	const { t } = useTranslation();
	const { answerPrompt } = useSafetyJourney();

	return (
		<div className="grid grid-cols-2 gap-2">
			{RECOVERY_OPTIONS[exposure].map((option) => {
				const Icon = OPTION_ICONS[option];

				return (
					<Button
						key={option}
						type="button"
						variant="outline"
						onClick={() => answerPrompt(option)}
						className="h-11 cursor-pointer justify-start gap-2 bg-background text-left"
					>
						<Icon className="size-4 shrink-0" style={{ color: COLORS.indigo }} aria-hidden={true} />
						<span className="truncate">{t(($) => $.safetyJourney.prompt.options[option])}</span>
					</Button>
				);
			})}
		</div>
	);
}

/**
 * The red-zone alert in the bell list, changed in place into "Back in green — what helped?".
 * No extra notification is sent; it is one prompt per alert and it can be put off with "Not now".
 */
export function RecoveryPrompt() {
	const { t } = useTranslation();
	const { prompt, skipPrompt, reopenPrompt, undoAnswer } = useSafetyJourney();
	const exposureName = t(($) => $.exposures[prompt.exposure]);
	const title = t(($) => $.safetyJourney.prompt.backInGreen, { exposure: exposureName });

	switch (prompt.status) {
		case "ask": {
			return (
				<li className="flex flex-col gap-3 px-2 py-3" style={{ backgroundColor: tint(COLORS.indigo) }}>
					<div className="flex items-center gap-3">
						<ExposureIcon type={prompt.exposure} size="md" dangerLevel="safe" />
						<div className="flex min-w-0 flex-1 flex-col gap-0.5">
							<span className="font-semibold text-sm">{title}</span>
							<span className="text-muted-foreground text-xs">
								{t(($) => $.safetyJourney.prompt.redPeriod, {
									start: prompt.redStart,
									end: prompt.redEnd,
								})}
							</span>
						</div>
						<span
							className="shrink-0 rounded-full bg-background px-2 py-0.5 font-semibold text-xs"
							style={{ color: COLORS.indigo }}
						>
							{t(($) => $.safetyJourney.common.pointsDelta, {
								points: getRule("recoveryAnswer").points,
							})}
						</span>
					</div>
					<RecoveryOptionButtons exposure={prompt.exposure} />
					<button
						type="button"
						onClick={skipPrompt}
						className="cursor-pointer self-start text-muted-foreground text-xs underline hover:text-foreground"
					>
						{t(($) => $.safetyJourney.prompt.notNow)}
					</button>
				</li>
			);
		}

		case "done": {
			const answerKey = prompt.answer ?? "somethingElse";
			const answer = t(($) => $.safetyJourney.prompt.options[answerKey]);

			return (
				<li className="flex items-center gap-3 px-2 py-3" style={{ backgroundColor: tint(COLORS.teal) }}>
					<span
						className="flex size-9 shrink-0 items-center justify-center rounded-full text-white"
						style={{ backgroundColor: COLORS.teal }}
					>
						<Check className="size-4" strokeWidth={3} aria-hidden={true} />
					</span>
					<div className="flex min-w-0 flex-1 flex-col gap-0.5">
						<span className="font-semibold text-sm">
							{prompt.awardedPoints
								? t(($) => $.safetyJourney.prompt.answered, { points: prompt.awardedPoints, answer })
								: t(($) => $.safetyJourney.prompt.answeredNoPoints, { answer })}
						</span>
						<span className="text-muted-foreground text-xs">{t(($) => $.safetyJourney.prompt.thanks)}</span>
					</div>
					<Button type="button" variant="ghost" size="sm" onClick={undoAnswer} className="cursor-pointer">
						{t(($) => $.safetyJourney.prompt.undo)}
					</Button>
				</li>
			);
		}

		case "skipped": {
			return (
				<li className="flex items-center gap-3 px-2 py-2.5">
					<ExposureIcon type={prompt.exposure} size="md" dangerLevel="safe" />
					<div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
						<span className="font-medium text-sm">{title}</span>
						<button
							type="button"
							onClick={reopenPrompt}
							className="cursor-pointer text-xs hover:underline"
							style={{ color: COLORS.indigo }}
						>
							{t(($) => $.safetyJourney.prompt.answerLater)}
						</button>
					</div>
					<span className="shrink-0 text-muted-foreground text-xs tabular-nums">
						{t(($) => $.safetyJourney.prompt.since, { time: prompt.redEnd })}
					</span>
				</li>
			);
		}

		default: {
			const exhaustive: never = prompt.status;

			return exhaustive;
		}
	}
}
