import type { YAxisTickContentProps } from "recharts";
import { COLLAPSED_Y_AXIS_WIDTH } from "./collapsed-y-axis-width.ts";

export function CollapsedYAxisTick({ y, label }: Pick<YAxisTickContentProps, "y"> & { label: string }) {
	return (
		// The label sits inside the plot, so a halo in the card's color keeps gridlines and threshold lines from
		// running through the digits
		<text
			x={COLLAPSED_Y_AXIS_WIDTH}
			y={y}
			textAnchor="start"
			dominantBaseline="middle"
			fill="var(--color-muted-foreground)"
			stroke="var(--color-card)"
			strokeWidth={4}
			strokeLinejoin="round"
			paintOrder="stroke"
			fontSize={12}
			className="text-sm tabular-nums"
		>
			{label}
		</text>
	);
}
