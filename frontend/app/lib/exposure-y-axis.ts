import type { ExposureDto } from "@/lib/dto/exposure.ts";
import type { Exposure } from "@/lib/exposures.ts";
import { computeYAxisRange, DUST_Y_AXIS_STEP } from "@/lib/utils.ts";

const EXPOSURE_BASE_MAX_Y: Record<Exposure, number> = {
	dust: 45,
	noise: 150,
	vibration: 450,
};

function getYAxisOptions(exposure: Exposure, usePeakAggregation: boolean) {
	if (exposure === "dust") {
		return { step: DUST_Y_AXIS_STEP, topPadding: DUST_Y_AXIS_STEP };
	}

	if (exposure === "noise" && usePeakAggregation) {
		return { step: 130 };
	}

	return {};
}


export function getExposureYAxisRange(
	exposure: Exposure,
	data: Array<ExposureDto>,
	options: { usePeakAggregation?: boolean } = {},
): { minY: number; maxY: number } {
	const usePeakAggregation = options.usePeakAggregation ?? false;

	const maxValue = data.reduce((max, point) => {
		const value = usePeakAggregation && point.peakValue != null ? point.peakValue : point.value;
		return value > max ? value : max;
	}, 0);

	const baseMaxY = EXPOSURE_BASE_MAX_Y[exposure];
	const maxY =
		maxValue > baseMaxY ? computeYAxisRange(data, getYAxisOptions(exposure, usePeakAggregation)).maxY : baseMaxY;

	return { minY: 0, maxY };
}
