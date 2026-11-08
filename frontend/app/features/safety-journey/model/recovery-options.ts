import type { ActionCount, RecoveryOptionKey } from "@/features/safety-journey/model/types.ts";
import type { Exposure } from "@/lib/exposures.ts";

/** Preset answers to "what helped?", so answers can be counted instead of being vague free text */
export const RECOVERY_OPTIONS = {
	noise: ["hearingProtection", "movedAway", "tookBreak", "somethingElse"],
	vibration: ["changedTool", "changedTask", "tookBreak", "somethingElse"],
	dust: ["usedRespirator", "movedAway", "tookBreak", "somethingElse"],
} as const satisfies Record<Exposure, ReadonlyArray<RecoveryOptionKey>>;

/** Every option once, in the order the foreman chart lists them */
export const ALL_RECOVERY_OPTIONS = [
	"changedTool",
	"tookBreak",
	"movedAway",
	"hearingProtection",
	"changedTask",
	"usedRespirator",
	"somethingElse",
] as const satisfies ReadonlyArray<RecoveryOptionKey>;

/**
 * Totals per option for one exposure (or all), sorted by count.
 * Options that don't apply to the chosen exposure are left out.
 */
export function countAnswers(answers: ReadonlyArray<ActionCount>, exposure: Exposure | "all") {
	const options: ReadonlyArray<RecoveryOptionKey> =
		exposure === "all" ? ALL_RECOVERY_OPTIONS : RECOVERY_OPTIONS[exposure];

	return options
		.map((option) => ({
			option,
			count: answers
				.filter((a) => a.option === option && (exposure === "all" || a.exposure === exposure))
				.reduce((sum, a) => sum + a.count, 0),
		}))
		.filter(({ option, count }) => count > 0 || exposure !== "all" || option === "somethingElse")
		.sort((a, b) => b.count - a.count);
}
