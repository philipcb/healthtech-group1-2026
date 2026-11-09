import type {
	BadgeProgress,
	PointEvent,
	RecoveryPrompt,
	RedeemedReward,
	Reward,
	TeamSummary,
	Weekday,
} from "@/features/safety-journey/model/types.ts";

export const MONTHLY_BUDGET_KR = 5000;

export const operatorMock = {
	lifetimePoints: 420,
	balance: 120,
	streakDays: 6,
	/** Nothing earned yet today, so the demo shows points coming in live */
	today: [] satisfies Array<PointEvent>,
	week: [
		{ day: "mon", status: "clean", isToday: false },
		{ day: "tue", status: "clean", isToday: false },
		{ day: "wed", status: "clean", isToday: false },
		{ day: "thu", status: "missed", isToday: true },
		{ day: "fri", status: "upcoming", isToday: false },
	] satisfies Array<Weekday>,
	/** Today's red-zone alerts, newest first. Only the first answer gives points (1 per day). */
	prompts: [
		{ id: "dust-1315", exposure: "dust", redStart: "13:15", redEnd: "13:31", status: "ask" },
		{ id: "vibration-1005", exposure: "vibration", redStart: "10:05", redEnd: "10:12", status: "ask" },
		{ id: "noise-0840", exposure: "noise", redStart: "08:40", redEnd: "08:52", status: "ask" },
	] satisfies Array<RecoveryPrompt>,
	badges: [
		{ key: "cleanWeek", progress: 5 },
		{ key: "alwaysOn", progress: 20 },
		{ key: "noiseDetective", progress: 1 },
		{ key: "steadyStreak", progress: 10 },
		{ key: "sharpEye", progress: 7 },
		{ key: "preventer", progress: 22 },
	] satisfies Array<BadgeProgress>,
	redeemedEarlier: [
		{ rewardId: "coffee", date: "2026-10-28" },
		{ rewardId: "lunch", date: "2026-10-03" },
	] satisfies Array<RedeemedReward>,
};

/** Set by management on the rewards page; operators only see the active ones */
export const rewardsMock: Array<Reward> = [
	{
		id: "coffee",
		nameKey: "coffee",
		icon: "coffee",
		cost: 100,
		valueKr: 40,
		maxPerPersonPerMonth: 4,
		redeemedThisMonth: 23,
		active: true,
	},
	{
		id: "lunch",
		nameKey: "lunch",
		icon: "lunch",
		cost: 200,
		valueKr: 150,
		maxPerPersonPerMonth: 2,
		redeemedThisMonth: 6,
		active: true,
	},
	{
		id: "gym",
		nameKey: "gym",
		icon: "gym",
		cost: 300,
		valueKr: 120,
		maxPerPersonPerMonth: 1,
		redeemedThisMonth: 0,
		active: false,
	},
];

/** This week only: foremen can't see further back than one week */
export const teamMock: TeamSummary = {
	teamName: "Team North",
	operatorCount: 8,
	activeOperators: 7,
	teamPoints: 1240,
	cleanShifts: 31,
	plannedShifts: 40,
	alertsAnswered: 8,
	alertsTotal: 9,
	answers: [
		{ exposure: "vibration", option: "changedTool", count: 3 },
		{ exposure: "vibration", option: "tookBreak", count: 1 },
		{ exposure: "noise", option: "movedAway", count: 2 },
		{ exposure: "noise", option: "tookBreak", count: 1 },
		{ exposure: "noise", option: "hearingProtection", count: 1 },
	],
};
