import type { Reward } from "@/features/safety-journey/model/types.ts";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

/** Demo rewards have translated names; rewards added by management keep the name they were given */
export function useRewardName() {
	const { t } = useTranslation();

	return useCallback(
		(reward: Pick<Reward, "nameKey" | "customName">) => {
			const { nameKey } = reward;

			return nameKey ? t(($) => $.safetyJourney.rewards.names[nameKey]) : (reward.customName ?? "");
		},
		[t],
	);
}
