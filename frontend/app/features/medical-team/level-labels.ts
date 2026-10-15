import type { TranslateFn } from "@/i18n/config.ts";
import { DANGER_LEVEL_SEVERITY, type DangerLevel, DangerLevelSchema } from "@/lib/danger-levels.ts";

/** Most severe first, the same order as the foreman's pie chart cards */
export const severityOrder = DangerLevelSchema.options.toSorted(
	(a, b) => DANGER_LEVEL_SEVERITY[b] - DANGER_LEVEL_SEVERITY[a],
);

export function getLevelLabels(t: TranslateFn): Record<DangerLevel, string> {
	return {
		safe: t(($) => $.medicalTeamDashboard.yardOverview.shiftExceedance.safe),
		warning: t(($) => $.medicalTeamDashboard.yardOverview.shiftExceedance.betweenActionAndLimit),
		danger: t(($) => $.medicalTeamDashboard.yardOverview.shiftExceedance.aboveLimit),
	};
}
