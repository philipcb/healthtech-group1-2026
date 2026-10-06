import { ChartContainer, ChartTooltip } from "@/components/ui/chart.tsx";
import { type DangerLevel, DangerLevelSchema, dangerlevelStyles } from "@/lib/danger-levels.ts";
import { Pie, PieChart, type PieSectorShapeProps, Sector } from "recharts";

const pieShape = (props: PieSectorShapeProps) => {
	const color = (props.name && dangerlevelStyles[props.name as DangerLevel].color) || "#ccc";

	return <Sector {...props} fill={color} fillOpacity={0.4} stroke={color} />;
};

interface Props {
	data: Record<DangerLevel, number>;
	labels: Record<DangerLevel, string>;
	hoverable?: boolean;
}

export function DangerLevelPieChart({ data, labels, hoverable }: Props) {
	const chartData = DangerLevelSchema.options.map((level) => ({
		name: level,
		value: data[level],
	}));

	return (
		<ChartContainer config={{}} className="size-full">
			<PieChart responsive={true} style={{ cursor: hoverable ? "pointer" : undefined }}>
				<Pie
					dataKey={"value"}
					isAnimationActive={false}
					data={chartData}
					labelLine={false}
					shape={pieShape}
					innerRadius="60%"
					outerRadius="100%"
				/>
				<ChartTooltip
					content={({ active, payload }) => {
						if (!(active && payload?.length)) {
							return null;
						}

						const level = payload[0].name as DangerLevel;
						const value = payload[0].value;

						return (
							<div className="grid min-w-[8rem] gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
								<div className="flex items-center justify-between gap-2">
									<span className="text-muted-foreground">{labels[level]}</span>
									<span className="font-medium font-mono text-foreground tabular-nums">{value}</span>
								</div>
							</div>
						);
					}}
				/>
			</PieChart>
		</ChartContainer>
	);
}
