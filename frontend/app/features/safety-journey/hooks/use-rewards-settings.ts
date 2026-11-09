import { useSafetyJourney } from "@/features/safety-journey/state/use-safety-journey.ts";

/**
 * Management's view of the shared demo rewards. Changes here show up in the operator's Rewards tab
 * when switching role in the demo, since both read the same provider.
 */
export function useRewardsSettings() {
	const { rewards, toggleReward, addReward, monthlyBudgetKr, setMonthlyBudget } = useSafetyJourney();
	const usedKr = rewards.reduce((sum, r) => sum + r.redeemedThisMonth * r.valueKr, 0);

	return { rewards, toggleReward, addReward, monthlyBudgetKr, setMonthlyBudget, usedKr };
}
