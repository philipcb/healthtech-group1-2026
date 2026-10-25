import { DangerLevelDots } from "@/components/danger-level-dots.tsx";
import { ThresholdLegendLine } from "@/components/exposure-line-chart/threshold-legend.tsx";
import { type DangerLevel, dangerlevelStyles } from "@/lib/danger-levels.ts";
import { getThresholdStrokeDasharray, type Threshold } from "@/lib/thresholds.ts";
import { cn } from "@/lib/utils.ts";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";

const SCALE_MAX_FACTOR = 1.5;

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

export function DangerLevelBadgeLegend() {
	const { t } = useTranslation();
	const labels = {
		safe: t(($) => $.aggregatedExposure.overview.belowActionValue),
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
			<li className="flex items-center gap-1.5">
				<span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center">
					<span className="h-3 w-0.5 bg-foreground/70" />
				</span>
				{t(($) => $.aggregatedExposure.overview.thresholdMarks)}
			</li>
		</ul>
	);
}

export function ThresholdBarLegend() {
	const { t } = useTranslation();
	const labels = {
		safe: t(($) => $.aggregatedExposure.overview.belowActionValue),
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
