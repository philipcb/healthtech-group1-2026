import type { Exposure } from "@/lib/exposures.ts";

export type LevelKey = "aware" | "observer" | "preventer" | "improver" | "safetyChampion";

export type Level = { key: LevelKey; minPoints: number };

export type EarnRuleKey = "cleanShift" | "weeklyChallenge" | "learningChallenge" | "recoveryAnswer";

export type EarnRule = {
	key: EarnRuleKey;
	points: number;
	limit: { count: number; per: "day" | "week" };
	/** Whether the points count towards the daily cap. The weekly bonus comes on top of it. */
	countsTowardsDailyCap: boolean;
};

/** Points earned at a time of day, e.g. a learning challenge at 08:10 */
export type PointEvent = { rule: EarnRuleKey; points: number; time: string };

export type WeekdayKey = "mon" | "tue" | "wed" | "thu" | "fri";

export type WeekdayStatus = "clean" | "missed" | "upcoming";

export type Weekday = { day: WeekdayKey; status: WeekdayStatus; isToday: boolean };

export type BadgeShape = "hexagon" | "shield" | "rosette";

export type BadgeSymbol = "eye" | "headphones" | "shieldCheck" | "calendar" | "bolt" | "team";

export type BadgeKey = "cleanWeek" | "alwaysOn" | "noiseDetective" | "steadyStreak" | "sharpEye" | "preventer";

export type BadgeStyle = { shape: BadgeShape; color: string; symbol: BadgeSymbol };

export type BadgeDef = BadgeStyle & { key: BadgeKey; target: number };

export type BadgeProgress = { key: BadgeKey; progress: number };

export type RecoveryOptionKey =
	| "changedTool"
	| "changedTask"
	| "tookBreak"
	| "hearingProtection"
	| "movedAway"
	| "usedRespirator"
	| "somethingElse";

export type RecoveryPromptStatus = "ask" | "done" | "skipped";

/** The "what helped?" question shown after the operator has left the red zone */
export type RecoveryPrompt = {
	exposure: Exposure;
	redStart: string;
	redEnd: string;
	status: RecoveryPromptStatus;
	answer?: RecoveryOptionKey;
	/** Points actually given for the answer, after the daily cap */
	awardedPoints?: number;
};

export type RewardIcon = "coffee" | "lunch" | "gym" | "gift";

export type RewardNameKey = "coffee" | "lunch" | "gym";

export type Reward = {
	id: string;
	/** Translated name for the demo rewards; rewards added by management use `customName` */
	nameKey?: RewardNameKey;
	customName?: string;
	icon: RewardIcon;
	cost: number;
	valueKr: number;
	maxPerPersonPerMonth: number;
	redeemedThisMonth: number;
	active: boolean;
};

export type NewReward = Pick<Reward, "customName" | "cost" | "valueKr" | "maxPerPersonPerMonth">;

export type Coupon = { rewardId: string; code: string };

/** An earlier redemption, `date` as yyyy-MM-dd */
export type RedeemedReward = { rewardId: string; date: string };

export type ActionCount = { exposure: Exposure; option: RecoveryOptionKey; count: number };

export type TeamSummary = {
	teamName: string;
	operatorCount: number;
	activeOperators: number;
	teamPoints: number;
	cleanShifts: number;
	plannedShifts: number;
	alertsAnswered: number;
	alertsTotal: number;
	answers: ReadonlyArray<ActionCount>;
};
