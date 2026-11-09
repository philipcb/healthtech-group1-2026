import { MONTHLY_BUDGET_KR, operatorMock, rewardsMock } from "@/features/safety-journey/model/mock-data.ts";
import { getAwardablePoints, getTodayPoints } from "@/features/safety-journey/model/rules.ts";
import type {
	EarnRuleKey,
	LearningOptionKey,
	NewReward,
	RecoveryOptionKey,
	RecoveryPrompt,
} from "@/features/safety-journey/model/types.ts";
import {
	SafetyJourneyContext,
	type SafetyJourneyState,
} from "@/features/safety-journey/state/safety-journey-context.ts";
import { formatDate } from "date-fns";
import { type ReactNode, useMemo, useReducer } from "react";

type Action =
	| { type: "answerPrompt"; promptId: string; option: RecoveryOptionKey; time: string }
	| { type: "skipPrompt"; promptId: string }
	| { type: "reopenPrompt"; promptId: string }
	| { type: "undoAnswer"; promptId: string }
	| { type: "answerLearning"; choice: LearningOptionKey; time: string }
	| { type: "redeem"; rewardId: string }
	| { type: "toggleReward"; rewardId: string }
	| { type: "addReward"; reward: NewReward; id: string }
	| { type: "setMonthlyBudget"; kr: number };

const initialState: SafetyJourneyState = {
	lifetimePoints: operatorMock.lifetimePoints,
	balance: operatorMock.balance,
	todayEvents: operatorMock.today,
	prompts: operatorMock.prompts,
	learning: undefined,
	rewards: rewardsMock,
	coupons: [],
	monthlyBudgetKr: MONTHLY_BUDGET_KR,
};

/** Demo coupon codes, counting up from SAFE-4821 */
const couponCode = (index: number) => `SAFE-${4821 + index}`;

const updatePrompt = (
	state: SafetyJourneyState,
	promptId: string,
	update: (prompt: RecoveryPrompt) => RecoveryPrompt,
): SafetyJourneyState => ({
	...state,
	prompts: state.prompts.map((prompt) => (prompt.id === promptId ? update(prompt) : prompt)),
});

/** Gives the points a rule allows right now; 0 points still counts as done but adds nothing to today */
function earn(state: SafetyJourneyState, rule: EarnRuleKey, time: string, sourceId?: string) {
	const points = getAwardablePoints(state.todayEvents, rule);
	const next: SafetyJourneyState = points
		? {
				...state,
				lifetimePoints: state.lifetimePoints + points,
				balance: state.balance + points,
				todayEvents: [...state.todayEvents, { rule, points, time, sourceId }],
			}
		: state;

	return { next, points };
}

function reducer(state: SafetyJourneyState, action: Action): SafetyJourneyState {
	switch (action.type) {
		case "answerPrompt": {
			const prompt = state.prompts.find((p) => p.id === action.promptId);

			if (!prompt || prompt.status === "done") return state;

			const { next, points } = earn(state, "recoveryAnswer", action.time, prompt.id);

			return updatePrompt(next, prompt.id, (p) => ({
				...p,
				status: "done",
				answer: action.option,
				awardedPoints: points,
			}));
		}

		case "skipPrompt": {
			return updatePrompt(state, action.promptId, (p) => ({ ...p, status: "skipped" }));
		}

		case "reopenPrompt": {
			return updatePrompt(state, action.promptId, (p) => ({ ...p, status: "ask" }));
		}

		case "undoAnswer": {
			const points = state.prompts.find((p) => p.id === action.promptId)?.awardedPoints ?? 0;

			return updatePrompt(
				{
					...state,
					lifetimePoints: state.lifetimePoints - points,
					balance: state.balance - points,
					todayEvents: state.todayEvents.filter((e) => e.sourceId !== action.promptId),
				},
				action.promptId,
				(p) => ({ ...p, status: "ask", answer: undefined, awardedPoints: undefined }),
			);
		}

		case "answerLearning": {
			if (state.learning) return state;

			const { next, points } = earn(state, "learningChallenge", action.time);

			return { ...next, learning: { choice: action.choice, awardedPoints: points } };
		}

		case "redeem": {
			const reward = state.rewards.find((r) => r.id === action.rewardId);

			if (!reward?.active || state.balance < reward.cost) return state;

			return {
				...state,
				balance: state.balance - reward.cost,
				rewards: state.rewards.map((r) =>
					r.id === reward.id ? { ...r, redeemedThisMonth: r.redeemedThisMonth + 1 } : r,
				),
				coupons: [{ rewardId: reward.id, code: couponCode(state.coupons.length) }, ...state.coupons],
			};
		}

		case "toggleReward": {
			return {
				...state,
				rewards: state.rewards.map((r) => (r.id === action.rewardId ? { ...r, active: !r.active } : r)),
			};
		}

		case "addReward": {
			return {
				...state,
				rewards: [
					...state.rewards,
					{ ...action.reward, id: action.id, icon: "gift", redeemedThisMonth: 0, active: true },
				],
			};
		}

		case "setMonthlyBudget": {
			return { ...state, monthlyBudgetKr: action.kr };
		}

		default: {
			const exhaustive: never = action;

			return exhaustive;
		}
	}
}

const now = () => formatDate(new Date(), "HH:mm");

/**
 * Hardcoded demo state shared by the header icon, the bell and the Safety Journey pages.
 * Lives in memory only, so the demo starts over when the page is reloaded.
 */
export function SafetyJourneyProvider({ children }: { children: ReactNode }) {
	const [state, dispatch] = useReducer(reducer, initialState);

	const value = useMemo(
		() => ({
			...state,
			todayPoints: getTodayPoints(state.todayEvents),
			openPrompts: state.prompts.filter((p) => p.status !== "done"),
			unreadPromptCount: state.prompts.filter((p) => p.status === "ask").length,
			nextAnswerPoints: getAwardablePoints(state.todayEvents, "recoveryAnswer"),
			nextLearningPoints: getAwardablePoints(state.todayEvents, "learningChallenge"),
			badgeProgress: operatorMock.badges.map((badge) =>
				badge.key === "sharpEye" && state.learning ? { ...badge, progress: badge.progress + 1 } : badge,
			),
			answerPrompt: (promptId: string, option: RecoveryOptionKey) =>
				dispatch({ type: "answerPrompt", promptId, option, time: now() }),
			skipPrompt: (promptId: string) => dispatch({ type: "skipPrompt", promptId }),
			reopenPrompt: (promptId: string) => dispatch({ type: "reopenPrompt", promptId }),
			undoAnswer: (promptId: string) => dispatch({ type: "undoAnswer", promptId }),
			answerLearning: (choice: LearningOptionKey) => dispatch({ type: "answerLearning", choice, time: now() }),
			redeem: (rewardId: string) => dispatch({ type: "redeem", rewardId }),
			toggleReward: (rewardId: string) => dispatch({ type: "toggleReward", rewardId }),
			addReward: (reward: NewReward) => dispatch({ type: "addReward", reward, id: `custom-${Date.now()}` }),
			setMonthlyBudget: (kr: number) => dispatch({ type: "setMonthlyBudget", kr }),
		}),
		[state],
	);

	return <SafetyJourneyContext value={value}>{children}</SafetyJourneyContext>;
}
