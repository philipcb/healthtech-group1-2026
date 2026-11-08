import { Field, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { COLORS } from "@/features/safety-journey/model/colors.ts";
import { useId } from "react";
import { useTranslation } from "react-i18next";

type RewardBudgetCardProps = { budgetKr: number; usedKr: number; onBudgetChange: (kr: number) => void };

export function RewardBudgetCard({ budgetKr, usedKr, onBudgetChange }: RewardBudgetCardProps) {
	const { t } = useTranslation();
	const inputId = useId();

	return (
		<section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
			<h2 className="font-semibold">{t(($) => $.safetyJourney.rewardsSettings.budget.title)}</h2>
			<Field>
				<FieldLabel htmlFor={inputId}>{t(($) => $.safetyJourney.rewardsSettings.budget.label)}</FieldLabel>
				<Input
					id={inputId}
					type="number"
					min={0}
					step={500}
					value={budgetKr}
					onChange={(event) => onBudgetChange(Math.max(0, Number(event.target.value)))}
				/>
			</Field>
			<div className="flex justify-between text-sm">
				<span>{t(($) => $.safetyJourney.rewardsSettings.budget.used)}</span>
				<span className="font-semibold tabular-nums">
					{t(($) => $.safetyJourney.common.kr, { amount: usedKr.toLocaleString() })}
				</span>
			</div>
			<Progress
				value={budgetKr ? Math.min(100, (usedKr / budgetKr) * 100) : 100}
				className="h-1.5 bg-muted [&>*]:bg-(--bar-color)"
				style={{ "--bar-color": COLORS.teal } as React.CSSProperties}
			/>
			<p className="text-muted-foreground text-xs">
				{t(($) => $.safetyJourney.rewardsSettings.budget.pauseInfo)}
			</p>
		</section>
	);
}
