import { useState } from "react";
import type { MouseHandlerDataParam, YAxisProps } from "recharts";

// Phone charts work like a stock app's: they run edge to edge, the figure above them shows the latest value, and
// dragging along the chart shows the value under the finger instead. Letting go returns to the latest value.

// The page's side gutter (layout.tsx's mx-5), so the figure and the axis labels line up with the rest of the page
export const CHART_SCRUB_GUTTER = 20;

// About three quarters of the screen's width, like a stock app's chart, but never taller than most of the screen
export const SCRUB_CHART_HEIGHT_CLASSNAME = "!aspect-auto !h-[75vw] !max-h-[60dvh]";
// The live page stacks five charts, so its are a bit shorter
export const SCRUB_COMPACT_CHART_HEIGHT_CLASSNAME = "!aspect-auto !h-[60vw] !max-h-[50dvh]";

/** The index of the point under the finger or mouse, or null when nothing is picked */
export function useChartScrub(enabled: boolean) {
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	const follow = ({ activeTooltipIndex }: MouseHandlerDataParam) =>
		setActiveIndex(activeTooltipIndex == null ? null : Number(activeTooltipIndex));
	const release = () => setActiveIndex(null);

	return {
		activeIndex: enabled ? activeIndex : null,
		// pan-y keeps vertical scrolling for the page while a sideways drag picks points
		chartProps: enabled
			? {
					onMouseMove: follow,
					onTouchMove: follow,
					onMouseLeave: release,
					onTouchEnd: release,
					style: { touchAction: "pan-y" },
				}
			: {},
	};
}

/** Labels inside the plot's right edge, so the plot gets the whole width */
export const SCRUB_Y_AXIS_PROPS = {
	orientation: "right",
	mirror: true,
	tickLine: false,
	axisLine: false,
	tickSize: 0,
	tickMargin: 12,
	// A halo in the card's color keeps the line and the threshold lines from running through the digits
	tick: {
		fontSize: 12,
		fill: "var(--color-muted-foreground)",
		stroke: "var(--color-card)",
		strokeWidth: 4,
		strokeLinejoin: "round",
		paintOrder: "stroke",
		className: "tabular-nums",
	},
} satisfies YAxisProps;
