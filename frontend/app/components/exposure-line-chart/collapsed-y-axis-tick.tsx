import type { YAxisTickContentProps } from "recharts";
import { COLLAPSED_Y_AXIS_WIDTH } from "./collapsed-y-axis-width.ts";

export function CollapsedYAxisTick({ y, label }: Pick<YAxisTickContentProps, "y"> & { label: string }) {
	return (
		<text
			x={COLLAPSED_Y_AXIS_WIDTH}
			y={y}
			textAnchor="start"
			dominantBaseline="middle"
			fill="var(--color-muted-foreground)"
			fontSize={12}
			className="text-sm"
		>
			{label}
		</text>
	);
}
