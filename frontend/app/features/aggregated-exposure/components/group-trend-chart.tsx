import { CollapsedYAxisTick } from "@/components/exposure-line-chart/collapsed-y-axis-tick.tsx";
import { COLLAPSED_Y_AXIS_WIDTH } from "@/components/exposure-line-chart/collapsed-y-axis-width.ts";
import { ExposureDot } from "@/components/exposure-line-chart/exposure-dot.tsx";
import { ExposureLineChartGradientStops } from "@/components/exposure-line-chart/exposure-line-chart-gradient-stops.tsx";
import { ThresholdLine } from "@/components/exposure-line-chart/threshold-line.tsx";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart.tsx";
import { formatGroupNumber, formatGroupValue, getGroupUnitLabel } from "@/features/aggregated-exposure/model/groups.ts";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import { useIsMobile } from "@/hooks/use-mobile.ts";
import type { TrendPointDto } from "@/lib/api/generated/models/index.ts";
import { dangerlevelStyles, getDangerLevel } from "@/lib/danger-levels.ts";
import type { ExposureUnit } from "@/lib/exposures.ts";
import type { Threshold } from "@/lib/thresholds.ts";
import { differenceInCalendarDays, eachMonthOfInterval, format, max, parseISO } from "date-fns";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Area, CartesianGrid, ComposedChart, Dot, Line, XAxis, YAxis, type YAxisTickContentProps } from "recharts";

const Y_AXIS_PADDING = 0.1;
const MAX_DAYS_WITH_DAY_TICKS = 62;
const MAX_POINTS_WITH_DOTS = 31;
const Y_AXIS_WIDTH = 60;
const NEUTRAL_COLOR = "var(--chart-1)";

type ChartRow = {
	timestamp: number;
	tooltipLabel: string;
	value: number | null;
};

type GroupTrendChartProps = {
	points: Array<TrendPointDto>;
	unit: ExposureUnit;
	label: string;
	threshold: Threshold | null;
};

export function GroupTrendChart({ points, unit, label, threshold }: GroupTrendChartProps) {
	const { t } = useTranslation();
	const formatDate = useFormatDate();
	const gradientId = useId();
	const isMobile = useIsMobile();
	const chartConfig = { value: { label, color: NEUTRAL_COLOR } };

	const rows: Array<ChartRow> = points.map((point) => {
		// The backend sends the start of each UTC day, which is the same day in the app's time zone. Its local date is
		// drawn at local midnight.
		const date = parseISO(format(point.time, "yyyy-MM-dd"));

		return { timestamp: date.getTime(), tooltipLabel: formatDate(date, "EEEE d. MMMM yyyy"), value: point.value };
	});

	const firstDay = rows[0]?.timestamp ?? 0;
	const lastDay = rows.at(-1)?.timestamp ?? 0;
	const showsMonths = differenceInCalendarDays(lastDay, firstDay) > MAX_DAYS_WITH_DAY_TICKS;
	const ticks = showsMonths
		? eachMonthOfInterval({ start: firstDay, end: lastDay }).map((month) => max([month, firstDay]).getTime())
		: rows.map((row) => row.timestamp);
	const showsEveryDot = rows.length <= MAX_POINTS_WITH_DOTS;
	const values = rows.flatMap((row) => (row.value === null ? [] : [row.value]));
	const hasLoneValue = values.length === 1;

	const scaleValues = threshold === null ? values : [...values, threshold.warning, threshold.danger];
	const yMin = Math.min(...scaleValues) * (1 - Y_AXIS_PADDING);
	const yMax = Math.max(...scaleValues) * (1 + Y_AXIS_PADDING);

	const formatYValue = (value: number) => formatGroupNumber(value, unit, value < 10 ? 1 : 0);

	const getColor = (value: number) =>
		threshold === null
			? NEUTRAL_COLOR
			: dangerlevelStyles[getDangerLevel(value, threshold.warning, threshold.danger)].color;

	return (
		<ChartContainer config={chartConfig} className="aspect-auto h-64 w-full sm:h-72">
			<ComposedChart accessibilityLayer={true} data={rows} margin={{ left: 12, right: 12, top: 8 }}>
				<CartesianGrid vertical={true} stroke="var(--color-muted-foreground)" strokeOpacity={0.2} />
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
					tick={{ className: "text-sm", fill: "var(--color-muted-foreground)" }}
				/>
				<YAxis
					width={isMobile ? COLLAPSED_Y_AXIS_WIDTH : Y_AXIS_WIDTH}
					tickLine={false}
					axisLine={false}
					tick={
						isMobile
							? (tickProps: YAxisTickContentProps) => (
									<CollapsedYAxisTick
										y={tickProps.y}
										label={formatYValue(Number(tickProps.payload.value))}
									/>
								)
							: { className: "text-sm", fill: "var(--color-muted-foreground)" }
					}
					domain={[yMin, yMax]}
					tickFormatter={formatYValue}
					label={
						isMobile
							? undefined
							: {
									value: getGroupUnitLabel(unit, t),
									position: "inside",
									dx: -32,
									angle: -90,
									className: "text-base",
									fill: "var(--color-muted-foreground)",
								}
					}
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
										{t(($) => $.aggregatedExposure.group.suppressed)}
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

				<defs>
					{threshold !== null && (
						<>
							<linearGradient id={`${gradientId}-line`} x1="0" y1="0" x2="0" y2="1">
								<ExposureLineChartGradientStops
									values={values}
									warningThreshold={threshold.warning}
									dangerThreshold={threshold.danger}
								/>
							</linearGradient>
							<linearGradient id={`${gradientId}-area`} x1="0" y1="0" x2="0" y2="1">
								<ExposureLineChartGradientStops
									values={[yMin, Math.max(...values)]}
									warningThreshold={threshold.warning}
									dangerThreshold={threshold.danger}
								/>
							</linearGradient>
						</>
					)}
					<linearGradient id={`${gradientId}-fade-gradient`} x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="white" stopOpacity={1} />
						<stop offset="50%" stopColor="white" stopOpacity={1} />
						<stop offset="100%" stopColor="white" stopOpacity={0} />
					</linearGradient>
					<mask id={`${gradientId}-fade-mask`}>
						<rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId}-fade-gradient)`} />
					</mask>
				</defs>

				<Area
					dataKey="value"
					type="linear"
					fill={threshold === null ? NEUTRAL_COLOR : `url(#${gradientId}-area)`}
					stroke="none"
					baseValue={yMin}
					fillOpacity={0.25}
					mask={`url(#${gradientId}-fade-mask)`}
					connectNulls={true}
					isAnimationActive={false}
					tooltipType="none"
				/>
				<Line
					dataKey="value"
					// Straight lines between days, since a curve would suggest values between them that weren't measured
					type="linear"
					stroke={threshold === null ? NEUTRAL_COLOR : `url(#${gradientId}-line)`}
					strokeWidth={3}
					strokeLinejoin="round"
					dot={({ cx, cy, index }) => {
						const value = rows[index]?.value ?? null;

						return value !== null && (showsEveryDot || hasLoneValue) ? (
							<Dot key={index} cx={cx} cy={cy} r={3} fill={getColor(value)} />
						) : null;
					}}
					activeDot={
						threshold === null
							? { r: 5, fill: NEUTRAL_COLOR, stroke: "none" }
							: (props) => (
									<ExposureDot {...props} warning={threshold.warning} danger={threshold.danger} />
								)
					}
					connectNulls={true}
					isAnimationActive={false}
				/>

				{threshold !== null && (
					<>
						<ThresholdLine y={threshold.warning} dangerLevel="warning" />
						<ThresholdLine y={threshold.danger} dangerLevel="danger" />
					</>
				)}
			</ComposedChart>
		</ChartContainer>
	);
}
