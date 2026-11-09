import type {
	BadgeProgress,
	Coupon,
	LearningAnswer,
	LearningOptionKey,
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
	/** Today's "what helped?" prompts, newest first */
	prompts: ReadonlyArray<RecoveryPrompt>;
	/** Today's learning challenge answer, once given */
	learning?: LearningAnswer;
	rewards: ReadonlyArray<Reward>;
	coupons: ReadonlyArray<Coupon>;
	monthlyBudgetKr: number;
};

export type SafetyJourneyContextValue = SafetyJourneyState & {
	/** Points earned today that count towards the daily cap */
	todayPoints: number;
	/** Prompts that still want an answer (asked or put off with "Not now") */
	openPrompts: ReadonlyArray<RecoveryPrompt>;
	/** Prompts not looked at yet, counted in the bell */
	unreadPromptCount: number;
	/** Points the next "what helped?" answer would give; 0 once today's limit is used */
	nextAnswerPoints: number;
	/** Points the learning challenge would give right now */
	nextLearningPoints: number;
	/** Badge progress including what was done in this demo session */
	badgeProgress: ReadonlyArray<BadgeProgress>;
	answerPrompt: (promptId: string, option: RecoveryOptionKey) => void;
	skipPrompt: (promptId: string) => void;
	reopenPrompt: (promptId: string) => void;
	undoAnswer: (promptId: string) => void;
	answerLearning: (choice: LearningOptionKey) => void;
	redeem: (rewardId: string) => void;
	toggleReward: (rewardId: string) => void;
	addReward: (reward: NewReward) => void;
	setMonthlyBudget: (kr: number) => void;
};

export const SafetyJourneyContext = createContext<SafetyJourneyContextValue | undefined>(undefined);
