import type { DangerLevel } from "@/lib/danger-levels.ts";
import type { Exposure, ExposureTypeField } from "@/lib/exposures.ts";

export type Threshold = {
	warning: number;
	danger: number;
	peakDanger: number | null;
};

const thresholds: Record<Exposure, Threshold> = {
	dust: {
		warning: 7.5,
		danger: 15,
		peakDanger: null,
	},
	noise: {
		warning: 80,
		danger: 85,
		peakDanger: 130,
	},
	vibration: {
		warning: 100,
		danger: 400,
		peakDanger: null,
	},
};

// TODO: Verify the TWA thresholds with the customer, including their unit and reference period (such as 8 hours). They
// have no documented source, and the TWA values are the same as STEL's here, which isn't to be assumed in production.
const dustThresholdOverrides: Partial<Record<ExposureTypeField, Threshold>> = {
	pm1_stel: {
		warning: 7.5,
		danger: 15,
		peakDanger: null,
	},
	pm25_stel: {
		warning: 7.5,
		danger: 15,
		peakDanger: null,
	},
	pm4_stel: {
		warning: 7.5,
		danger: 15,
		peakDanger: null,
	},
	pm10_stel: {
		warning: 15,
		danger: 30,
		peakDanger: null,
	},
	pm1_twa: {
		warning: 7.5,
		danger: 15,
		peakDanger: null,
	},
	pm25_twa: {
		warning: 7.5,
		danger: 15,
		peakDanger: null,
	},
	pm4_twa: {
		warning: 7.5,
		danger: 15,
		peakDanger: null,
	},
	pm10_twa: {
		warning: 15,
		danger: 30,
		peakDanger: null,
	},
};

export function getThreshold(exposure: Exposure, dustField?: ExposureTypeField | null): Threshold {
	if (exposure === "dust" && dustField) {
		return dustThresholdOverrides[dustField] ?? thresholds.dust;
	}

	return thresholds[exposure];
}

export function getThresholdStrokeDasharray(dangerLevel: DangerLevel): string {
	return dangerLevel === "danger" ? "8 4" : "4 4";
}
