import { COLORS } from "@/features/safety-journey/model/colors.ts";
import type { RewardIcon } from "@/features/safety-journey/model/types.ts";
import { Coffee, Dumbbell, Gift, type LucideIcon, Utensils } from "lucide-react";

/** Icon and colour per reward type, shared by the operator's Rewards tab and the management table */
export const REWARD_ICONS: Record<RewardIcon, { icon: LucideIcon; color: string }> = {
	coffee: { icon: Coffee, color: COLORS.gold },
	lunch: { icon: Utensils, color: COLORS.teal },
	gym: { icon: Dumbbell, color: COLORS.plum },
	gift: { icon: Gift, color: COLORS.indigo },
};
