import { ExposureIcon } from "@/components/exposure-icon.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
	AnswerPointsPill,
	RecoveryOptionButtons,
} from "@/features/safety-journey/components/notifications/recovery-prompt.tsx";
import { COLORS, tint } from "@/features/safety-journey/model/colors.ts";
import type { RecoveryPrompt } from "@/features/safety-journey/model/types.ts";
import { useSafetyJourney } from "@/features/safety-journey/state/use-safety-journey.ts";
import { useState } from "react";
import { useTranslation } from "react-i18next";

function PendingPromptRow({ prompt }: { prompt: RecoveryPrompt }) {
	const { t } = useTranslation();
	const [expanded, setExpanded] = useState(false);

	return (
		<li className="flex flex-col gap-3 rounded-md bg-background p-2.5">
			<div className="flex items-center gap-3">
				<ExposureIcon type={prompt.exposure} size="sm" dangerLevel="safe" />
				<div className="min-w-0 flex-1">
					<p className="font-medium text-sm">
						{t(($) => $.safetyJourney.prompt.backInGreen, {
							exposure: t(($) => $.exposures[prompt.exposure]),
						})}
					</p>
					<p className="text-muted-foreground text-xs">
						{t(($) => $.safetyJourney.prompt.since, { time: prompt.redEnd })}
					</p>
				</div>
				{expanded ? (
					<AnswerPointsPill />
				) : (
					<Button
						type="button"
						size="sm"
						onClick={() => setExpanded(true)}
						className="cursor-pointer text-white"
						style={{ backgroundColor: COLORS.indigo }}
					>
						{t(($) => $.safetyJourney.prompt.answer)}
					</Button>
				)}
			</div>
			{expanded && <RecoveryOptionButtons prompt={prompt} />}
		</li>
	);
}

/** "Waiting for your answer": the same questions as in the bell, answerable right here in the dialog */
export function PendingPromptCard() {
	const { t } = useTranslation();
	const { openPrompts, nextAnswerPoints } = useSafetyJourney();

	if (!openPrompts.length) return null;

	return (
		<section
			className="flex flex-col gap-2.5 rounded-lg border p-3"
			style={{ backgroundColor: tint(COLORS.indigo), borderColor: tint(COLORS.indigo) }}
		>
			<div>
				<p className="font-semibold text-xs uppercase tracking-wide" style={{ color: COLORS.indigo }}>
					{t(($) => $.safetyJourney.prompt.waiting)}
				</p>
				<p className="text-muted-foreground text-xs">
					{nextAnswerPoints
						? t(($) => $.safetyJourney.prompt.oneTap, { points: nextAnswerPoints })
						: t(($) => $.safetyJourney.prompt.oneTapNoPoints)}
				</p>
			</div>
			<ul className="flex flex-col gap-2">
				{openPrompts.map((prompt) => (
					<PendingPromptRow key={prompt.id} prompt={prompt} />
				))}
			</ul>
		</section>
	);
}
