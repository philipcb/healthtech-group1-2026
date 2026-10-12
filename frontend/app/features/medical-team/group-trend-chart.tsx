import { ChartContainer, ChartTooltip } from "@/components/ui/chart.tsx";
import { formatGroupNumber, formatGroupValue } from "@/features/medical-team/medical-team-groups.ts";
import type { GroupTrendPoint } from "@/features/medical-team/queries/medical-team-contracts.ts";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import type { ExposureUnit } from "@/lib/exposures.ts";
import { differenceInCalendarDays, eachMonthOfInterval, max, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";
import { CartesianGrid, Dot, Line, LineChart, XAxis, YAxis } from "recharts";

/** Keeps the line off the top and bottom edges, since group averages rarely start at zero */
const Y_AXIS_PADDING = 0.1;
/** Longer periods, like a year, get one tick per month instead of per day */
const MAX_DAYS_WITH_DAY_TICKS = 62;
/** With more points than this, a lone value is the only point that gets a dot, since it would otherwise not show at all */
const MAX_POINTS_WITH_DOTS = 31;

type ChartRow = {
	timestamp: number;
	tooltipLabel: string;
	value: number | null;
};

type GroupTrendChartProps = {
	/** One point per day with measurements, up to a whole year */
	points: Array<GroupTrendPoint>;
	unit: ExposureUnit;
	label: string;
};

/**
 * One aggregated line for the selected group, without danger levels, since those only apply to individuals. Every
 * daily value is drawn as is. Days without measurements, like weekends, are left out, and days hidden for privacy
 * (`null`) are skipped, so the line joins the nearest shown days on either side without any value made up between them.
 */
export function GroupTrendChart({ points, unit, label }: GroupTrendChartProps) {
	const { t } = useTranslation();
	const formatDate = useFormatDate();
	const chartConfig = { value: { label, color: "var(--chart-1)" } };

	const rows: Array<ChartRow> = points.map((point) => {
		const date = parseISO(point.time);

		return { timestamp: date.getTime(), tooltipLabel: formatDate(date, "EEEE d. MMMM yyyy"), value: point.value };
	});

	const firstDay = rows[0]?.timestamp ?? 0;
	const lastDay = rows.at(-1)?.timestamp ?? 0;
	const showsMonths = differenceInCalendarDays(lastDay, firstDay) > MAX_DAYS_WITH_DAY_TICKS;
	// The first month's tick is moved to the first day with data, so it isn't left off the axis
	const ticks = showsMonths
		? eachMonthOfInterval({ start: firstDay, end: lastDay }).map((month) => max([month, firstDay]).getTime())
		: rows.map((row) => row.timestamp);
	const showsEveryDot = rows.length <= MAX_POINTS_WITH_DOTS;
	// The line skips hidden days, so a value only lacks a line to join when it's the only one
	const hasLoneValue = rows.filter((row) => row.value !== null).length === 1;

	return (
		<ChartContainer config={chartConfig} className="aspect-auto h-64 w-full sm:h-72">
			<LineChart accessibilityLayer={true} data={rows} margin={{ left: 4, right: 12, top: 8 }}>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="timestamp"
					type="number"
					scale="time"
					domain={["dataMin", "dataMax"]}
					ticks={ticks}
					tickFormatter={(timestamp: number) => formatDate(timestamp, showsMonths ? "LLL" : "dd.MM")}
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
					// Straight lines between days, since a curve would suggest values between them that weren't measured
					type="linear"
					stroke="var(--color-value)"
					strokeWidth={1.5}
					strokeLinejoin="round"
					dot={({ cx, cy, index }) =>
						showsEveryDot || (hasLoneValue && rows[index]?.value !== null) ? (
							<Dot key={index} cx={cx} cy={cy} r={2} fill="var(--color-value)" />
						) : null
					}
					activeDot={{ r: 4 }}
					connectNulls={true}
					isAnimationActive={false}
				/>
			</LineChart>
		</ChartContainer>
	);
}
