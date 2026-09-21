import type { ExposureDto } from "@/lib/dto/exposure.ts";
import type { Exposure } from "@/lib/exposures.ts";

export const DUST_Y_AXIS_STEP = 7.5;

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

export function computeYAxisRange(
	data: Array<ExposureDto>,
	options?: {
		topPadding?: number;
		bottomPadding?: number;
		//Rounds the Y-axix labels to make them more readable. For example, with a step of 10, a max value of 83 would be rounded up to 90.
		step?: number;
		clampToZero?: boolean;
	},
) {
	const { topPadding = 5, bottomPadding = 10, step = 10, clampToZero = true } = options ?? {};

	if (!data || data.length === 0) {
		return { minY: 0, maxY: step };
	}

	const max = data.reduce((m, c) => (c.value > m ? c.value : m), data[0].value);
	const min = data.reduce((m, c) => (c.value < m ? c.value : m), data[0].value);

	const maxY = Math.ceil(max / step) * step + topPadding;
	const minY = Math.floor((min - bottomPadding) / step) * step;
	const clampedMinY = clampToZero ? Math.max(0, minY) : minY;

	return { minY: clampedMinY, maxY };
}

export function buildYAxisTicks(minY: number, maxY: number, step: number): Array<number> {
	const ticks: Array<number> = [];
	const precision = Math.max(0, `${step}`.split(".")[1]?.length ?? 0);

	for (let value = minY; value <= maxY + step / 1000; value += step) {
		ticks.push(Number(value.toFixed(precision)));
	}

	return ticks;
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
