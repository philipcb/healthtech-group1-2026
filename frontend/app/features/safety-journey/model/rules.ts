import type { EarnRule, EarnRuleKey, Level, PointEvent } from "@/features/safety-journey/model/types.ts";

export const LEVELS = [
	{ key: "aware", minPoints: 0 },
	{ key: "observer", minPoints: 100 },
	{ key: "preventer", minPoints: 300 },
	{ key: "improver", minPoints: 500 },
	{ key: "safetyChampion", minPoints: 800 },
] as const satisfies ReadonlyArray<Level>;

/**
 * A clean shift is always worth more than answering after an alert,
 * so going into the red zone never pays off.
 */
export const EARN_RULES = [
	{ key: "cleanShift", points: 10, limit: { count: 1, per: "day" }, countsTowardsDailyCap: true },
	{ key: "weeklyChallenge", points: 20, limit: { count: 1, per: "week" }, countsTowardsDailyCap: false },
	{ key: "learningChallenge", points: 5, limit: { count: 1, per: "day" }, countsTowardsDailyCap: true },
	{ key: "recoveryAnswer", points: 5, limit: { count: 1, per: "day" }, countsTowardsDailyCap: true },
] as const satisfies ReadonlyArray<EarnRule>;

export const DAILY_POINT_CAP = 20;

/** Clean shifts needed in a week (out of 5) for the weekly bonus, so one bad day doesn't ruin the week */
export const WEEKLY_CHALLENGE_TARGET = 4;

export const SHIFTS_PER_WEEK = 5;

export function getRule(key: EarnRuleKey): EarnRule {
	const rule = EARN_RULES.find((r) => r.key === key);

	if (!rule) throw new Error(`Unknown earn rule: ${key}`);

	return rule;
}

/** Points a week of only clean shifts gives, shown to management when they set reward prices */
export const getCleanWeekPoints = () =>
	getRule("cleanShift").points * SHIFTS_PER_WEEK + getRule("weeklyChallenge").points;

export function getLevelIndex(lifetimePoints: number): number {
	return LEVELS.findLastIndex((level) => lifetimePoints >= level.minPoints);
}

export function getLevelProgress(lifetimePoints: number) {
	const index = getLevelIndex(lifetimePoints);
	const level = LEVELS[index];
	const next = LEVELS.at(index + 1);

	if (!next) return { index, level, next: undefined, percent: 100, pointsToNext: 0 };

	const percent = ((lifetimePoints - level.minPoints) / (next.minPoints - level.minPoints)) * 100;

	return { index, level, next, percent, pointsToNext: next.minPoints - lifetimePoints };
}

/** The points actually given when `points` are earned on a day that already has `todayPoints` */
export function applyDailyCap(todayPoints: number, points: number): number {
	return Math.max(0, Math.min(points, DAILY_POINT_CAP - todayPoints));
}

/** Points earned today that count towards the daily cap */
export function getTodayPoints(events: ReadonlyArray<PointEvent>): number {
	return events
		.filter((event) => getRule(event.rule).countsTowardsDailyCap)
		.reduce((sum, event) => sum + event.points, 0);
}

/**
 * The points a rule would give right now: 0 once its limit per day is used up, and never more than
 * what is left of the daily cap. This is what stops answering many alerts from farming points.
 */
export function getAwardablePoints(events: ReadonlyArray<PointEvent>, key: EarnRuleKey): number {
	const rule = getRule(key);
	const timesToday = events.filter((event) => event.rule === key && event.points > 0).length;

	if (rule.limit.per === "day" && timesToday >= rule.limit.count) return 0;

	return applyDailyCap(getTodayPoints(events), rule.points);
}
