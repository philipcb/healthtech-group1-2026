import { COLORS } from "@/features/safety-journey/model/colors.ts";
import type { BadgeDef, BadgeProgress, BadgeStyle } from "@/features/safety-journey/model/types.ts";

/** Badges reward doing things right; none of them need an alert first except Noise Detective */
export const BADGES = [
	{ key: "cleanWeek", shape: "shield", color: COLORS.gold, symbol: "shieldCheck", target: 5 },
	{ key: "alwaysOn", shape: "hexagon", color: COLORS.teal, symbol: "calendar", target: 20 },
	{ key: "noiseDetective", shape: "rosette", color: COLORS.indigo, symbol: "headphones", target: 1 },
	{ key: "steadyStreak", shape: "hexagon", color: COLORS.plum, symbol: "bolt", target: 10 },
	{ key: "sharpEye", shape: "rosette", color: COLORS.teal, symbol: "eye", target: 10 },
	{ key: "preventer", shape: "shield", color: COLORS.indigo, symbol: "shieldCheck", target: 30 },
] as const satisfies ReadonlyArray<BadgeDef>;

/** Earned together when the team has enough clean shifts in a week, so one person's slip doesn't ruin it */
export const TEAM_BADGE = {
	shape: "rosette",
	color: COLORS.gold,
	symbol: "team",
	target: 36,
} as const satisfies BadgeStyle & { target: number };

export const isUnlocked = (badge: BadgeDef, progress: BadgeProgress | undefined) =>
	(progress?.progress ?? 0) >= badge.target;

/** The locked badge with the highest progress ratio; ties keep the first in the list */
export function getClosestBadge(progress: ReadonlyArray<BadgeProgress>) {
	let closest: { badge: BadgeDef; progress: number } | undefined;

	for (const badge of BADGES) {
		const value = progress.find((p) => p.key === badge.key)?.progress ?? 0;

		if (value >= badge.target) continue;

		if (!closest || value / badge.target > closest.progress / closest.badge.target) {
			closest = { badge, progress: value };
		}
	}

	return closest;
}
