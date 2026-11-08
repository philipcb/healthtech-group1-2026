import type {
	Coupon,
	NewReward,
	PointEvent,
	RecoveryOptionKey,
	RecoveryPrompt,
	Reward,
} from "@/features/safety-journey/model/types.ts";
import { createContext } from "react";

export type SafetyJourneyState = {
	lifetimePoints: number;
	balance: number;
	todayEvents: ReadonlyArray<PointEvent>;
	prompt: RecoveryPrompt;
	rewards: ReadonlyArray<Reward>;
	coupons: ReadonlyArray<Coupon>;
	monthlyBudgetKr: number;
};

export type SafetyJourneyContextValue = SafetyJourneyState & {
	/** Points earned today that count towards the daily cap */
	todayPoints: number;
	/** The prompt still wants an answer (asked or put off with "Not now") */
	isPromptOpen: boolean;
	answerPrompt: (option: RecoveryOptionKey) => void;
	skipPrompt: () => void;
	reopenPrompt: () => void;
	undoAnswer: () => void;
	redeem: (rewardId: string) => void;
	toggleReward: (rewardId: string) => void;
	addReward: (reward: NewReward) => void;
	setMonthlyBudget: (kr: number) => void;
};

export const SafetyJourneyContext = createContext<SafetyJourneyContextValue | undefined>(undefined);
