import { ExposureIcon } from "@/components/exposure-icon.tsx";
import { Button } from "@/components/ui/button.tsx";
import { RecoveryOptionButtons } from "@/features/safety-journey/components/notifications/recovery-prompt.tsx";
import { COLORS, tint } from "@/features/safety-journey/model/colors.ts";
import { getRule } from "@/features/safety-journey/model/rules.ts";
import { useSafetyJourney } from "@/features/safety-journey/state/use-safety-journey.ts";
import { useState } from "react";
import { useTranslation } from "react-i18next";

/** "Waiting for your answer": the same question as in the bell, answerable right here in the dialog */
export function PendingPromptCard() {
	const { t } = useTranslation();
	const { prompt, isPromptOpen } = useSafetyJourney();
	const [expanded, setExpanded] = useState(false);

	if (!isPromptOpen) return null;

	return (
		<section
			className="flex flex-col gap-3 rounded-lg border p-3"
			style={{ backgroundColor: tint(COLORS.indigo), borderColor: tint(COLORS.indigo) }}
		>
			<div className="flex items-center gap-3">
				<ExposureIcon type={prompt.exposure} size="md" dangerLevel="safe" />
				<div className="min-w-0 flex-1">
					<p className="font-semibold text-xs uppercase tracking-wide" style={{ color: COLORS.indigo }}>
						{t(($) => $.safetyJourney.prompt.waiting)}
					</p>
					<p className="font-medium text-sm">
						{t(($) => $.safetyJourney.prompt.backInGreen, {
							exposure: t(($) => $.exposures[prompt.exposure]),
						})}
					</p>
					<p className="text-muted-foreground text-xs">
						{t(($) => $.safetyJourney.prompt.oneTap, { points: getRule("recoveryAnswer").points })}
					</p>
				</div>
				{!expanded && (
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
			{expanded && <RecoveryOptionButtons exposure={prompt.exposure} />}
		</section>
	);
}
