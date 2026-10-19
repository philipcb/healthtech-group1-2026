import type { ExposureThresholdSummaryDto, ThresholdSummaryDto } from "@/lib/api/generated/models/index.ts";

export type ThresholdSummary = Required<ThresholdSummaryDto>;

const NO_WORKERS: ExposureThresholdSummaryDto = { safe: 0, warning: 0, danger: 0 };

/** The backend returns `{}` for a manager without subordinates, which means that every count is 0 */
export const withMissingCountsAsZero = ({ noise, dust, vibration, total }: ThresholdSummaryDto): ThresholdSummary => ({
	noise: noise ?? NO_WORKERS,
	dust: dust ?? NO_WORKERS,
	vibration: vibration ?? NO_WORKERS,
	total: total ?? NO_WORKERS,
});
