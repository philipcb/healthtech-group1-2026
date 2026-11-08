import { MONTHLY_BUDGET_KR, operatorMock, rewardsMock } from "@/features/safety-journey/model/mock-data.ts";
import { applyDailyCap, EARN_RULES, getRule } from "@/features/safety-journey/model/rules.ts";
import type { NewReward, PointEvent, RecoveryOptionKey } from "@/features/safety-journey/model/types.ts";
import {
	SafetyJourneyContext,
	type SafetyJourneyState,
} from "@/features/safety-journey/state/safety-journey-context.ts";
import { formatDate } from "date-fns";
import { type ReactNode, useMemo, useReducer } from "react";

type Action =
	| { type: "answerPrompt"; option: RecoveryOptionKey; time: string }
	| { type: "skipPrompt" }
	| { type: "reopenPrompt" }
	| { type: "undoAnswer" }
	| { type: "redeem"; rewardId: string }
	| { type: "toggleReward"; rewardId: string }
	| { type: "addReward"; reward: NewReward; id: string }
	| { type: "setMonthlyBudget"; kr: number };

const initialState: SafetyJourneyState = {
	lifetimePoints: operatorMock.lifetimePoints,
	balance: operatorMock.balance,
	todayEvents: operatorMock.today,
	prompt: operatorMock.prompt,
	rewards: rewardsMock,
	coupons: [],
	monthlyBudgetKr: MONTHLY_BUDGET_KR,
};

const cappedRules = new Set<string>(EARN_RULES.filter((r) => r.countsTowardsDailyCap).map((r) => r.key));

const getTodayPoints = (events: ReadonlyArray<PointEvent>) =>
	events.filter((e) => cappedRules.has(e.rule)).reduce((sum, e) => sum + e.points, 0);

/** Demo coupon codes, counting up from SAFE-4821 */
const couponCode = (index: number) => `SAFE-${4821 + index}`;

function reducer(state: SafetyJourneyState, action: Action): SafetyJourneyState {
	switch (action.type) {
		case "answerPrompt": {
			if (state.prompt.status === "done") return state;

			const points = applyDailyCap(getTodayPoints(state.todayEvents), getRule("recoveryAnswer").points);

			return {
				...state,
				lifetimePoints: state.lifetimePoints + points,
				balance: state.balance + points,
				todayEvents: [...state.todayEvents, { rule: "recoveryAnswer", points, time: action.time }],
				prompt: { ...state.prompt, status: "done", answer: action.option, awardedPoints: points },
			};
		}

		case "skipPrompt": {
			return { ...state, prompt: { ...state.prompt, status: "skipped" } };
		}

		case "reopenPrompt": {
			return { ...state, prompt: { ...state.prompt, status: "ask" } };
		}

		case "undoAnswer": {
			const points = state.prompt.awardedPoints ?? 0;

			return {
				...state,
				lifetimePoints: state.lifetimePoints - points,
				balance: state.balance - points,
				todayEvents: state.todayEvents.filter((e) => e.rule !== "recoveryAnswer"),
				prompt: { ...state.prompt, status: "ask", answer: undefined, awardedPoints: undefined },
			};
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
			isPromptOpen: state.prompt.status !== "done",
			answerPrompt: (option: RecoveryOptionKey) =>
				dispatch({ type: "answerPrompt", option, time: formatDate(new Date(), "HH:mm") }),
			skipPrompt: () => dispatch({ type: "skipPrompt" }),
			reopenPrompt: () => dispatch({ type: "reopenPrompt" }),
			undoAnswer: () => dispatch({ type: "undoAnswer" }),
			redeem: (rewardId: string) => dispatch({ type: "redeem", rewardId }),
			toggleReward: (rewardId: string) => dispatch({ type: "toggleReward", rewardId }),
			addReward: (reward: NewReward) => dispatch({ type: "addReward", reward, id: `custom-${Date.now()}` }),
			setMonthlyBudget: (kr: number) => dispatch({ type: "setMonthlyBudget", kr }),
		}),
		[state],
	);

	return <SafetyJourneyContext value={value}>{children}</SafetyJourneyContext>;
}
