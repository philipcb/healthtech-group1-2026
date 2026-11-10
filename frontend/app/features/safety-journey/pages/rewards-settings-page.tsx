import { AddRewardForm } from "@/features/safety-journey/components/management/add-reward-form.tsx";
import { RewardBudgetCard } from "@/features/safety-journey/components/management/reward-budget-card.tsx";
import { RewardsTable } from "@/features/safety-journey/components/management/rewards-table.tsx";
import { BackButton } from "@/features/safety-journey/components/shared/back-button.tsx";
import { useRewardsSettings } from "@/features/safety-journey/hooks/use-rewards-settings.ts";
import { useTranslation } from "react-i18next";
import { href } from "react-router";

/** Management view: the rewards operators can spend SafePoints on, and the monthly budget */
export function RewardsSettingsPage() {
	const { t } = useTranslation();
	const { rewards, toggleReward, addReward, monthlyBudgetKr, setMonthlyBudget, usedKr } = useRewardsSettings();

	return (
		<div className="flex w-full min-w-0 flex-col gap-4">
			<div className="flex flex-col gap-2 border-b pb-3">
				<BackButton fallback={href("/management")} />
				<header>
					<h1 className="font-medium text-2xl">{t(($) => $.safetyJourney.rewardsSettings.title)}</h1>
					<p className="text-muted-foreground text-sm">
						{t(($) => $.safetyJourney.rewardsSettings.subtitle)}
					</p>
				</header>
			</div>

			<div className="grid gap-4 lg:grid-cols-3">
				<div className="min-w-0 lg:col-span-2">
					<RewardsTable rewards={rewards} onToggle={toggleReward} />
				</div>
				<div className="flex flex-col gap-4">
					<RewardBudgetCard budgetKr={monthlyBudgetKr} usedKr={usedKr} onBudgetChange={setMonthlyBudget} />
					<AddRewardForm onAdd={addReward} />
				</div>
			</div>
		</div>
	);
}
