import { COLORS, tint } from "@/features/safety-journey/model/colors.ts";
import { TODAY_LEARNING_CHALLENGE } from "@/features/safety-journey/model/learning-challenges.ts";
import type { LearningOptionKey } from "@/features/safety-journey/model/types.ts";
import { useSafetyJourney } from "@/features/safety-journey/state/use-safety-journey.ts";
import { cn } from "@/lib/utils.ts";
import { Check, GraduationCap, X } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * One short question a day. Points are for taking part, right or wrong, so guessing gives nothing extra;
 * the explanation afterwards is the learning.
 */
export function LearningChallengeCard() {
	const { t } = useTranslation();
	const { learning, nextLearningPoints, answerLearning } = useSafetyJourney();
	const challenge = TODAY_LEARNING_CHALLENGE;
	const isCorrect = learning?.choice === challenge.correct;

	const optionState = (option: LearningOptionKey) => {
		if (!learning) return "open";
		if (option === challenge.correct) return "correct";
		if (option === learning.choice) return "wrong";

		return "other";
	};

	return (
		<section className="flex flex-col gap-3 rounded-lg border p-3">
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-center gap-2">
					<span
						className="flex size-7 shrink-0 items-center justify-center rounded-full"
						style={{ backgroundColor: tint(COLORS.plum), color: COLORS.plum }}
					>
						<GraduationCap className="size-4" aria-hidden={true} />
					</span>
					<p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
						{t(($) => $.safetyJourney.learning.title)}
					</p>
				</div>
				{!learning && (
					<span
						className="shrink-0 rounded-full px-2.5 py-0.5 font-semibold text-xs"
						style={{ backgroundColor: tint(COLORS.plum), color: COLORS.plum }}
					>
						{nextLearningPoints
							? t(($) => $.safetyJourney.common.pointsDelta, { points: nextLearningPoints })
							: t(($) => $.safetyJourney.prompt.limitReached)}
					</span>
				)}
			</div>

			<p className="font-medium text-sm">{t(($) => $.safetyJourney.learning.questions[challenge.id].question)}</p>

			<ul className="flex flex-col gap-2">
				{challenge.options.map((option) => {
					const state = optionState(option);

					return (
						<li key={option}>
							<button
								type="button"
								disabled={Boolean(learning)}
								onClick={() => answerLearning(option)}
								className={cn(
									"flex min-h-11 w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors",
									state === "open" && "cursor-pointer hover:bg-accent",
									state === "other" && "text-muted-foreground",
									state === "correct" && "font-medium",
								)}
								style={
									state === "correct"
										? { borderColor: COLORS.teal, backgroundColor: tint(COLORS.teal) }
										: undefined
								}
							>
								<span className="flex-1">
									{t(($) => $.safetyJourney.learning.questions[challenge.id].options[option])}
								</span>
								{state === "correct" && (
									<Check
										className="size-4 shrink-0"
										style={{ color: COLORS.teal }}
										aria-hidden={true}
									/>
								)}
								{state === "wrong" && (
									<X className="size-4 shrink-0 text-muted-foreground" aria-hidden={true} />
								)}
							</button>
						</li>
					);
				})}
			</ul>

			{learning && (
				<div className="flex flex-col gap-1 text-sm" aria-live="polite">
					<p className="font-semibold">
						{isCorrect
							? t(($) => $.safetyJourney.learning.correct)
							: t(($) => $.safetyJourney.learning.incorrect)}{" "}
						<span className="font-normal text-muted-foreground">
							{learning.awardedPoints
								? t(($) => $.safetyJourney.learning.earned, { points: learning.awardedPoints })
								: t(($) => $.safetyJourney.prompt.limitReached)}
						</span>
					</p>
					<p className="text-muted-foreground">
						{t(($) => $.safetyJourney.learning.questions[challenge.id].explanation)}
					</p>
				</div>
			)}
		</section>
	);
}
