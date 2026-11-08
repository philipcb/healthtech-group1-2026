import {
	ChartScrubCursor,
	ChartScrubDot,
	ChartScrubHeader,
	ChartScrubTracker,
	ChartScrubValue,
} from "@/components/chart-scrub.tsx";
import { ExposureDot } from "@/components/exposure-line-chart/exposure-dot.tsx";
import { ExposureLineChartGradientStops } from "@/components/exposure-line-chart/exposure-line-chart-gradient-stops.tsx";
import { ThresholdLine } from "@/components/exposure-line-chart/threshold-line.tsx";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart.tsx";
import { TrendTooltip } from "@/features/aggregated-exposure/components/trend-tooltip.tsx";
import { useTrendAxes } from "@/features/aggregated-exposure/hooks/use-trend-axes.tsx";
import { formatGroupNumber, formatGroupValue, getGroupUnitLabel } from "@/features/aggregated-exposure/model/groups.ts";
import { getTrendYDomain, toTrendTime } from "@/features/aggregated-exposure/model/trend-chart.ts";
import { SCRUB_CHART_HEIGHT_CLASSNAME, useChartScrub } from "@/hooks/use-chart-scrub.ts";
import type { TrendPointDto } from "@/lib/api/generated/models/index.ts";
import { dangerlevelStyles, getDangerLevel } from "@/lib/danger-levels.ts";
import type { ExposureUnit } from "@/lib/exposures.ts";
import type { Threshold } from "@/lib/thresholds.ts";
import { cn } from "@/lib/utils.ts";
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
	/** The selected day, when the points are its hours */
	day?: Date;
};

export function GroupTrendChart({ points, unit, label, threshold, day }: GroupTrendChartProps) {
	const { t } = useTranslation();
	const gradientId = useId();
	const chartConfig = { value: { label, color: NEUTRAL_COLOR } };

	const days = points.map((point) => toTrendTime(point.time, day));
	const values = points.flatMap((point) => (point.value === null ? [] : [point.value]));
	const [yMin, yMax] = getTrendYDomain(values, threshold);
	const { xAxisProps, yAxisProps, isMobile, formatDay } = useTrendAxes({
		timestamps: days.map((time) => time.getTime()),
		unit,
		yDomain: [yMin, yMax],
		day,
	});

	const rows: Array<ChartRow> = points.map((point, index) => ({
		timestamp: days[index].getTime(),
		tooltipLabel: formatDay(days[index]),
		value: point.value,
	}));
	const showsEveryDot = rows.length <= MAX_POINTS_WITH_DOTS;
	const hasLoneValue = values.length === 1;

	const getDangerLevelOf = (value: number) =>
		threshold === null ? null : getDangerLevel(value, threshold.warning, threshold.danger);
	const getColor = (value: number) => {
		const dangerLevel = getDangerLevelOf(value);
		return dangerLevel === null ? NEUTRAL_COLOR : dangerlevelStyles[dangerLevel].color;
	};

	// Phones show the picked point, or the latest one with a value, above the chart instead of in a tooltip
	const scrub = useChartScrub(isMobile);
	const shownRow = rows[scrub.activeIndex ?? rows.findLastIndex((row) => row.value !== null)];

	const chart = (
		<ChartContainer
			config={chartConfig}
			className={cn("aspect-auto h-64 w-full sm:h-72", isMobile && SCRUB_CHART_HEIGHT_CLASSNAME)}
		>
			<ComposedChart
				accessibilityLayer={true}
				data={rows}
				{...scrub.chartProps}
				margin={isMobile ? { left: 0, right: 0, top: 12 } : { left: 12, right: 12, top: 8 }}
			>
				{!isMobile && (
					<CartesianGrid vertical={true} stroke="var(--color-muted-foreground)" strokeOpacity={0.2} />
				)}
				<XAxis {...xAxisProps} />
				<YAxis {...yAxisProps} />
				{isMobile && <ChartScrubTracker />}
				{!isMobile && (
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
				)}

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
					// As thin as the operator's and foreman's line charts
					strokeWidth={1.25}
					strokeLinejoin="round"
					dot={({ cx, cy, index }) => {
						const value = rows[index]?.value ?? null;

						return value !== null && (showsEveryDot || hasLoneValue) ? (
							<Dot key={index} cx={cx} cy={cy} r={3} fill={getColor(value)} />
						) : null;
					}}
					activeDot={
						isMobile
							? false
							: threshold === null
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

				{scrub.activeIndex !== null && shownRow && (
					<>
						<ChartScrubCursor x={shownRow.timestamp} xEnd={rows[rows.length - 1].timestamp} />
						{shownRow.value !== null && (
							<ChartScrubDot x={shownRow.timestamp} y={shownRow.value} color={getColor(shownRow.value)} />
						)}
					</>
				)}
			</ComposedChart>
		</ChartContainer>
	);

	if (!(isMobile && shownRow)) {
		return chart;
	}

	return (
		<div className="flex w-full flex-col">
			<ChartScrubHeader
				caption={shownRow.tooltipLabel}
				dangerLevel={shownRow.value === null ? null : getDangerLevelOf(shownRow.value)}
			>
				<ChartScrubValue
					value={
						shownRow.value === null
							? t(($) => $.aggregatedExposure.group.suppressed)
							: formatGroupNumber(shownRow.value, unit)
					}
					unit={shownRow.value === null ? "" : getGroupUnitLabel(unit, t)}
				/>
			</ChartScrubHeader>
			{chart}
		</div>
	);
}
