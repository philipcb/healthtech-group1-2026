import { ChartContainer, ChartTooltip } from "@/components/ui/chart.tsx";
import { formatGroupNumber, formatGroupValue } from "@/features/medical-team/medical-team-groups.ts";
import type { GroupTrendGranularity, GroupTrendPoint } from "@/features/medical-team/medical-team-queries.ts";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import type { ExposureUnit } from "@/lib/exposures.ts";
import { parseISO } from "date-fns";
import { useTranslation } from "react-i18next";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

/** Keeps the line off the top and bottom edges, since group averages rarely start at zero */
const Y_AXIS_PADDING = 0.1;

type ChartRow = {
	time: string;
	label: string;
	tooltipLabel: string;
	value: number | null;
};

type GroupTrendChartProps = {
	points: Array<GroupTrendPoint>;
	granularity: GroupTrendGranularity;
	unit: ExposureUnit;
	label: string;
};

/** One aggregated line for the selected group, without danger levels, since those only apply to individuals */
export function GroupTrendChart({ points, granularity, unit, label }: GroupTrendChartProps) {
	const { t } = useTranslation();
	const formatDate = useFormatDate();
	const chartConfig = { value: { label, color: "var(--chart-1)" } };

	const rows: Array<ChartRow> = points.map((point) => {
		const date = parseISO(point.time);

		return {
			time: point.time,
			label: formatDate(date, granularity === "day" ? "dd.MM" : "LLL"),
			tooltipLabel: formatDate(date, granularity === "day" ? "EEEE d. MMMM yyyy" : "LLLL yyyy"),
			value: point.value,
		};
	});

	return (
		<ChartContainer config={chartConfig} className="aspect-auto h-64 w-full sm:h-72">
			<LineChart accessibilityLayer={true} data={rows} margin={{ left: 4, right: 12, top: 8 }}>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="label"
					tickLine={false}
					axisLine={false}
					tickMargin={8}
					interval="preserveStartEnd"
					minTickGap={16}
					fontSize={11}
				/>
				<YAxis
					width={44}
					tickLine={false}
					axisLine={false}
					fontSize={11}
					domain={[
						(dataMin: number) => dataMin * (1 - Y_AXIS_PADDING),
						(dataMax: number) => dataMax * (1 + Y_AXIS_PADDING),
					]}
					tickFormatter={(value: number) => formatGroupNumber(value, unit, value < 10 ? 1 : 0)}
				/>
				<ChartTooltip
					cursor={false}
					content={({ active, payload }) => {
						const row = payload?.[0]?.payload as ChartRow | undefined;

						if (!(active && row)) {
							return null;
						}

						return (
							<div className="rounded-md border bg-background p-3 text-sm shadow">
								<div className="mb-1 font-medium">{row.tooltipLabel}</div>
								{row.value === null ? (
									<div className="text-muted-foreground">
										{t(($) => $.medicalTeamDashboard.group.suppressed)}
									</div>
								) : (
									<div className="flex items-center justify-between gap-4">
										<span>{label}</span>
										<span className="font-medium tabular-nums">
											{formatGroupValue(row.value, unit, t)}
										</span>
									</div>
								)}
							</div>
						);
					}}
				/>
				<Line
					dataKey="value"
					type="monotone"
					stroke="var(--color-value)"
					strokeWidth={2}
					dot={{ r: 2, fill: "var(--color-value)" }}
					activeDot={{ r: 4 }}
					connectNulls={false}
					isAnimationActive={false}
				/>
			</LineChart>
		</ChartContainer>
	);
}
