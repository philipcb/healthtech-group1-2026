import type { ExposureDataDto } from "@/lib/api/generated/models/index.ts";
import type { Exposure } from "@/lib/exposures.ts";
import type { Threshold } from "@/lib/thresholds.ts";

export const DUST_Y_AXIS_STEP = 7.5;

// Roughly how many grid steps a live chart should have, and the "nice" step sizes it rounds to
const LIVE_TARGET_STEPS = 4;
const NICE_STEPS = [1, 2, 2.5, 5, 10];
const NOISE_MIN_SPAN_DB = 10;

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
	data: Array<ExposureDataDto>,
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
	data: Array<ExposureDataDto>,
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

/** Rounds a step up to 1, 2, 2.5 or 5 times a power of ten, so the axis labels stay readable. */
function niceStep(roughStep: number) {
	const magnitude = 10 ** Math.floor(Math.log10(roughStep));
	const normalized = roughStep / magnitude;
	const nice = NICE_STEPS.find((step) => step >= normalized) ?? 10;
	// toPrecision drops floating point noise like 0.25000000000000006
	return Number((nice * magnitude).toPrecision(12));
}

/**
 * Y range for the live charts, fitted to the data instead of the fixed day-chart ranges, so changes within a short
 * window stay visible. The action value is always in range, and the limit value once the data reaches the action
 * value. Noise has no meaningful zero on the dB scale, so its range also starts just below the data.
 */
export function getLiveYAxisRange(
	exposure: Exposure,
	data: Array<ExposureDataDto>,
	threshold: Threshold,
): { minY: number; maxY: number; ticks: Array<number> } {
	const values = data.map((point) => point.value);
	const maxValue = values.length > 0 ? Math.max(...values) : 0;
	const minValue = values.length > 0 ? Math.min(...values) : threshold.warning;

	const top = Math.max(maxValue, maxValue >= threshold.warning ? threshold.danger : threshold.warning);
	const bottom = exposure === "noise" ? Math.min(minValue, threshold.warning) : 0;

	// A floor on the span keeps a flat line (or no data) from collapsing the axis. Noise doesn't start at zero, so a
	// share of the top value would be far too wide for it.
	const minSpan = exposure === "noise" ? NOISE_MIN_SPAN_DB : top * 0.25;
	const span = Math.max(top - bottom, minSpan, 1);
	const step = niceStep(span / LIVE_TARGET_STEPS);

	// Half a step of headroom so the line and the threshold lines never sit on the chart edge
	const maxY = Math.ceil((top + step / 2) / step) * step;
	const minY = exposure === "noise" ? Math.max(0, Math.floor((bottom - step / 2) / step) * step) : 0;

	return { minY, maxY, ticks: buildYAxisTicks(minY, maxY, step) };
}
