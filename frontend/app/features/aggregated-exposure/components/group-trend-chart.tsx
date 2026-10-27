import { ExposureDot } from "@/components/exposure-line-chart/exposure-dot.tsx";
import { ExposureLineChartGradientStops } from "@/components/exposure-line-chart/exposure-line-chart-gradient-stops.tsx";
import { ThresholdLine } from "@/components/exposure-line-chart/threshold-line.tsx";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart.tsx";
import { TrendTooltip } from "@/features/aggregated-exposure/components/trend-tooltip.tsx";
import { useTrendAxes } from "@/features/aggregated-exposure/hooks/use-trend-axes.tsx";
import { formatGroupValue } from "@/features/aggregated-exposure/model/groups.ts";
import { getTrendYDomain, toTrendDay } from "@/features/aggregated-exposure/model/trend-chart.ts";
import type { TrendPointDto } from "@/lib/api/generated/models/index.ts";
import { dangerlevelStyles, getDangerLevel } from "@/lib/danger-levels.ts";
import type { ExposureUnit } from "@/lib/exposures.ts";
import type { Threshold } from "@/lib/thresholds.ts";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Area, CartesianGrid, ComposedChart, Dot, Line, XAxis, YAxis } from "recharts";

const MAX_POINTS_WITH_DOTS = 31;
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
	const gradientId = useId();
	const chartConfig = { value: { label, color: NEUTRAL_COLOR } };

	const days = points.map((point) => toTrendDay(point.time));
	const values = points.flatMap((point) => (point.value === null ? [] : [point.value]));
	const [yMin, yMax] = getTrendYDomain(values, threshold);
	const { xAxisProps, yAxisProps, formatDay } = useTrendAxes({
		timestamps: days.map((day) => day.getTime()),
		unit,
		yDomain: [yMin, yMax],
	});

	const rows: Array<ChartRow> = points.map((point, index) => ({
		timestamp: days[index].getTime(),
		tooltipLabel: formatDay(days[index]),
		value: point.value,
	}));
	const showsEveryDot = rows.length <= MAX_POINTS_WITH_DOTS;
	const hasLoneValue = values.length === 1;

	const getColor = (value: number) =>
		threshold === null
			? NEUTRAL_COLOR
			: dangerlevelStyles[getDangerLevel(value, threshold.warning, threshold.danger)].color;

	return (
		<ChartContainer config={chartConfig} className="aspect-auto h-64 w-full sm:h-72">
			<ComposedChart accessibilityLayer={true} data={rows} margin={{ left: 12, right: 12, top: 8 }}>
				<CartesianGrid vertical={true} stroke="var(--color-muted-foreground)" strokeOpacity={0.2} />
				<XAxis {...xAxisProps} />
				<YAxis {...yAxisProps} />
				<ChartTooltip
					cursor={false}
					content={({ active, payload }) => {
						const row = payload?.[0]?.payload as ChartRow | undefined;

						if (!(active && row)) {
							return null;
						}

						return (
							<TrendTooltip title={row.tooltipLabel}>
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
							</TrendTooltip>
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
