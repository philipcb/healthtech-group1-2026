import type { TranslateFn } from "@/i18n/config.ts";
import type { DangerLevel } from "@/lib/danger-levels.ts";
import { type Exposure, exposures } from "@/lib/exposures.ts";
import type { TimeBucketStatus } from "@/lib/time-bucket-types.ts";

type ExposureDangerLevels = TimeBucketStatus["exposureDangerLevels"];

/** The exposures that reached the given level, e.g. the ones that made a combined hour red. */
export function exposuresAtLevel(exposureDangerLevels: ExposureDangerLevels, level: DangerLevel): Array<Exposure> {
	return exposures.filter((exposure) => exposureDangerLevels?.[exposure] === level);
}

/**
 * Describes a combined day by its level and the exposures that caused it, e.g. "Above limit value (Noise, Dust)".
 */
export function describeDayStatus(t: TranslateFn, bucket: TimeBucketStatus | undefined): string {
	if (!bucket) {
		return t(($) => $.exposureStatus.noData);
	}

	const status = t(($) => $.dangerLevelStatus[bucket.dangerLevel]);
	const causes =
		bucket.dangerLevel === "safe" ? [] : exposuresAtLevel(bucket.exposureDangerLevels, bucket.dangerLevel);

	if (causes.length === 0) {
		return status;
	}

	return t(($) => $.exposureStatus.statusWithExposures, {
		status,
		exposures: causes.map((exposure) => t(($$) => $$.exposures[exposure])).join(", "),
	});
}
