import { dangerlevelStyles } from "@/lib/danger-levels.ts";
import type { Threshold } from "@/lib/thresholds.ts";
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
			{/* Marks the action and limit values on the scale */}
			{[threshold.warning, threshold.danger].map((mark) => (
				<span
					key={mark}
					className="absolute inset-y-0 left-(--mark-position) w-px bg-foreground/40"
					style={{ "--mark-position": toPercent(mark) } as CSSProperties}
				/>
			))}
		</span>
	);
}

/** Explains the bar's colors with words, so they don't rely on color alone */
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
					<span
						aria-hidden="true"
						className={cn("size-2.5 shrink-0 rounded-sm", dangerlevelStyles[level].bg)}
					/>
					{labels[level]}
				</li>
			))}
		</ul>
	);
}
