import { DangerLevelDots } from "@/components/danger-level-dots.tsx";
import { ThresholdLegendLine } from "@/components/exposure-line-chart/threshold-legend.tsx";
import { type DangerLevel, dangerlevelStyles } from "@/lib/danger-levels.ts";
import { getThresholdStrokeDasharray, type Threshold } from "@/lib/thresholds.ts";
import { cn } from "@/lib/utils.ts";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";

/** The bar goes from 0 to this factor times the limit value, the same scale as the existing exposure slider */
const SCALE_MAX_FACTOR = 1.5;

/**
 * A fixed scale from 0 to 1.5 × the limit value, so the same value always fills the same width with the same colors,
 * whichever other groups are shown. Values above the scale fill the whole bar, and the value itself is shown as text.
 */
export function ThresholdBar({ value, threshold }: { value: number | null; threshold: Threshold }) {
	const scaleMax = threshold.danger * SCALE_MAX_FACTOR;
	const filled = value === null ? 0 : Math.min(Math.max(value, 0), scaleMax);
	const toPercent = (part: number) => `${(part / scaleMax) * 100}%`;

	const parts = [
		{ level: "safe", width: Math.min(filled, threshold.warning) },
		{
			level: "warning",
			width: Math.min(Math.max(filled - threshold.warning, 0), threshold.danger - threshold.warning),
		},
		{ level: "danger", width: Math.max(filled - threshold.danger, 0) },
	] as const;

	return (
		<span aria-hidden="true" className="relative flex h-2 overflow-hidden rounded-full bg-muted">
			{parts.map((part) => (
				<span
					key={part.level}
					className={cn("h-full w-(--part-width) shrink-0", dangerlevelStyles[part.level].bg)}
					style={{ "--part-width": toPercent(part.width) } as CSSProperties}
				/>
			))}
			{/* Marks the action and limit values on the scale, wide and dark enough to see in grayscale */}
			{[threshold.warning, threshold.danger].map((mark) => (
				<span
					key={mark}
					className="absolute inset-y-0 left-(--mark-position) w-0.5 -translate-x-1/2 bg-foreground/70"
					style={{ "--mark-position": toPercent(mark) } as CSSProperties}
				/>
			))}
		</span>
	);
}

/**
 * The level as one, two or three dots in a circle, the same badge as the operator's limit explanation, so it doesn't
 * rely on color alone
 */
export function DangerLevelBadge({ dangerLevel }: { dangerLevel: DangerLevel }) {
	const { border, bgSubtle } = dangerlevelStyles[dangerLevel];

	return (
		<span
			aria-hidden="true"
			className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border", border, bgSubtle)}
		>
			<DangerLevelDots dangerLevel={dangerLevel} size="sm" />
		</span>
	);
}

/** Explains the overview's dot badges with words, in the same order as the bar's colors */
export function DangerLevelBadgeLegend() {
	const { t } = useTranslation();
	const labels = {
		safe: t(($) => $.occupationalHealthServiceDashboard.overview.belowActionValue),
		warning: t(($) => $.lineChart.warning),
		danger: t(($) => $.lineChart.danger),
	};

	return (
		<ul className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
			{(["safe", "warning", "danger"] as const).map((level) => (
				<li key={level} className="flex items-center gap-1.5">
					<DangerLevelBadge dangerLevel={level} />
					{labels[level]}
				</li>
			))}
		</ul>
	);
}

/**
 * Explains the colors with words and the operator page's line patterns, so they don't rely on color alone. Above the
 * action and limit values use the threshold lines' dashes, and below the action value is solid.
 */
export function ThresholdBarLegend() {
	const { t } = useTranslation();
	const labels = {
		safe: t(($) => $.occupationalHealthServiceDashboard.overview.belowActionValue),
		warning: t(($) => $.lineChart.warning),
		danger: t(($) => $.lineChart.danger),
	};

	return (
		<ul className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
			{(["safe", "warning", "danger"] as const).map((level) => (
				<li key={level} className="flex items-center gap-1.5">
					<ThresholdLegendLine
						label={labels[level]}
						color={dangerlevelStyles[level].color}
						strokeDasharray={level === "safe" ? undefined : getThresholdStrokeDasharray(level)}
					/>
					{labels[level]}
				</li>
			))}
		</ul>
	);
}
