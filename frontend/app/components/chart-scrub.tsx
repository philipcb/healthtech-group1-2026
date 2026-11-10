import { CHART_SCRUB_GUTTER } from "@/hooks/use-chart-scrub.ts";
import { type DangerLevel, dangerlevelStyles, mapDangerLevelToLabel } from "@/lib/danger-levels.ts";
import type { ReactNode } from "react";
import { ReferenceArea, ReferenceDot, ReferenceLine, Tooltip, usePlotArea, type XAxisTickContentProps } from "recharts";

// Above the cursor line and the lines it washes out, below the axis labels so they stay readable
const CURSOR_Z_INDEX = 450;

/**
 * Recharts only tracks the pointer when a chart has a tooltip, so this one tracks it without drawing anything.
 * Recharts keeps its own tooltip active after a touch ends, so the charts draw the cursor themselves.
 */
export function ChartScrubTracker() {
	return <Tooltip content={() => null} cursor={false} isAnimationActive={false} />;
}

/** The value above a phone chart, with its status and when it was measured */
export function ChartScrubHeader({
	title,
	caption,
	dangerLevel,
	children,
}: {
	title?: string;
	caption: string;
	dangerLevel?: DangerLevel | null;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1 pb-3" style={{ paddingInline: CHART_SCRUB_GUTTER }}>
			{title && <p className="font-medium text-sm">{title}</p>}
			{children}
			<p className="flex flex-wrap items-center gap-x-1.5 text-sm">
				{dangerLevel && (
					<>
						<span
							aria-hidden="true"
							className="size-2 shrink-0 rounded-full"
							style={{ backgroundColor: dangerlevelStyles[dangerLevel].color }}
						/>
						<span className="font-medium">{mapDangerLevelToLabel(dangerLevel)}</span>
						<span aria-hidden="true" className="text-muted-foreground">
							{"·"}
						</span>
					</>
				)}
				<span className="text-muted-foreground tabular-nums">{caption}</span>
			</p>
		</div>
	);
}

export function ChartScrubValue({ value, unit }: { value: string; unit: string }) {
	return (
		<p className="flex items-baseline gap-1.5">
			<span className="font-semibold text-3xl tabular-nums tracking-tight">{value}</span>
			<span className="font-medium text-base text-muted-foreground">{unit}</span>
		</p>
	);
}

/** A line through the picked point, with everything after it washed out */
export function ChartScrubCursor({ x, xEnd }: { x: number | string; xEnd: number | string }) {
	return (
		<>
			<ReferenceArea x1={x} x2={xEnd} fill="var(--color-card)" fillOpacity={0.7} zIndex={CURSOR_Z_INDEX} />
			<ReferenceLine x={x} stroke="var(--color-muted-foreground)" strokeOpacity={0.7} zIndex={CURSOR_Z_INDEX} />
		</>
	);
}

export function ChartScrubDot({ x, y, color }: { x: number | string; y: number; color: string }) {
	return <ReferenceDot x={x} y={y} r={5} fill={color} stroke="var(--color-card)" strokeWidth={2} />;
}

/** An x-axis label, left out when its point is so close to the screen's edge that the label would be cut off */
export function ScrubXAxisTick({ x, y, payload, index, tickFormatter }: XAxisTickContentProps) {
	const plotArea = usePlotArea();
	const tickX = Number(x);
	const left = plotArea?.x ?? 0;
	const right = left + (plotArea?.width ?? 0);

	if (tickX < left + CHART_SCRUB_GUTTER || tickX > right - CHART_SCRUB_GUTTER) {
		return null;
	}

	return (
		<text
			x={tickX}
			y={y}
			dy="0.71em"
			textAnchor="middle"
			fill="var(--color-muted-foreground)"
			className="text-xs tabular-nums"
		>
			{tickFormatter ? tickFormatter(payload.value, index) : payload.value}
		</text>
	);
}
