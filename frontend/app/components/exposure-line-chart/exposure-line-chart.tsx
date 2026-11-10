import {
	ChartScrubCursor,
	ChartScrubDot,
	ChartScrubHeader,
	ChartScrubTracker,
	ChartScrubValue,
	ScrubXAxisTick,
} from "@/components/chart-scrub.tsx";
import { ExposureTooltip } from "@/components/exposure-line-chart/exposure-tooltip.tsx";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart.tsx";
import {
	SCRUB_CHART_HEIGHT_CLASSNAME,
	SCRUB_COMPACT_CHART_HEIGHT_CLASSNAME,
	SCRUB_Y_AXIS_PROPS,
	useChartScrub,
} from "@/hooks/use-chart-scrub.ts";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import { useIsMobile } from "@/hooks/use-mobile.ts";
import { getLocale } from "@/i18n/locale.ts";
import type { ExposureDataDto } from "@/lib/api/generated/models/index.ts";
import { DangerLevels, dangerlevelStyles, getDangerLevel } from "@/lib/danger-levels.ts";
import { now as getNow, toTZDate } from "@/lib/date.ts";
import { buildYAxisTicks, DUST_Y_AXIS_STEP } from "@/lib/exposure-y-axis.ts";
import type { Exposure, ExposureTypeField, ExposureUnit } from "@/lib/exposures.ts";
import { getThreshold } from "@/lib/thresholds.ts";
import { cn, formatExposureValue, normalizeDangerLevelForPeakForLineChart } from "@/lib/utils.ts";
import { TZDate } from "@date-fns/tz";
import { addMinutes, formatDistanceToNowStrict } from "date-fns";
import { type PropsWithChildren, useId } from "react";
import { useTranslation } from "react-i18next";
import { Area, CartesianGrid, ComposedChart, Legend, Line, XAxis, type XAxisTickContentProps, YAxis } from "recharts";
import type { CurveType } from "recharts/types/shape/Curve";
import { ExposureDot } from "./exposure-dot.tsx";
import { ExposureLineChartGradientStops } from "./exposure-line-chart-gradient-stops.tsx";
import { ThresholdLegend } from "./threshold-legend.tsx";

export type XAxisMode = "default" | "windowed";

const Y_AXIS_WIDTH = 60;
// Room for dust in mg, which is shown with four decimals
const MG_Y_AXIS_WIDTH = 76;

const chartConfig = {
	desktop: {
		label: "Desktop",
		color: "var(--chart-1)",
	},
} satisfies ChartConfig;

type LineChartVariant = "default" | "compact";

export interface ExposureLineChartProps extends PropsWithChildren {
	chartData: Array<ExposureDataDto>;
	maxY: number;
	minY: number;
	// Overrides the default y ticks (only dust has fixed ones)
	yTicks?: Array<number>;
	unit: ExposureUnit;
	lineType?: CurveType;
	exposure: Exposure;
	usePeakData?: boolean;
	dustField?: ExposureTypeField;
	showArea?: boolean;
	unitLabelPosition?: "side" | "top";
	lineStrokeWidth?: number;

	chartContainerClassName?: string;
	showLegend?: boolean;

	variant?: LineChartVariant;
	xAxisMode?: XAxisMode;
	minTime: Date;
	maxTime: Date;
	breakoutOnMobile?: boolean;
	/** Named above the value on phones, when the section around the chart doesn't name it */
	title?: string;
}

export function ExposureLineChart({
	chartData,
	maxY,
	minY,
	yTicks: yTicksOverride,
	unit,
	lineType = "linear",
	children,
	exposure,
	usePeakData = false,
	dustField,
	showArea = true,
	unitLabelPosition = "side",
	lineStrokeWidth = 1.25,
	minTime,
	maxTime,
	chartContainerClassName,
	variant = "default",
	showLegend = true,
	xAxisMode = "default",
	breakoutOnMobile = false,
	title,
}: ExposureLineChartProps) {
	const { t, i18n } = useTranslation();
	const id = useId();
	const formatDate = useFormatDate();
	const isMobile = useIsMobile();

	const { warning, danger, peakDanger } = getThreshold(exposure, dustField);
	const dangerThreshold = usePeakData && peakDanger ? peakDanger : danger;
	const yTicks = yTicksOverride ?? (exposure === "dust" ? buildYAxisTicks(minY, maxY, DUST_Y_AXIS_STEP) : undefined);
	const defaultFractionDigits = exposure === "dust" ? 1 : 0;
	const fractionDigitsPerUnit = exposure === "dust" ? { mg: 4 } : { mg: 3 };

	const transformedData = chartData.map((item) => ({
		time: item.time.getTime(),
		value: usePeakData ? (item.peakValue ?? item.value) : item.value,
	}));

	const xMin = minTime.getTime();
	const xMax = maxTime.getTime();

	const compact = variant === "compact";
	const isMobileBreakout = breakoutOnMobile && isMobile;
	const isMobileCompact = compact && isMobile;
	const yAxisWidth = compact ? Y_AXIS_WIDTH : unit === "mg" ? MG_Y_AXIS_WIDTH : Y_AXIS_WIDTH;
	const scrub = useChartScrub(isMobileBreakout);

	const rawTicks = buildTicks(xAxisMode, minTime, maxTime);
	// Windowed labels ("3 hours", "now") are wide, so a phone-width compact chart only fits three. Phone charts that run
	// edge to edge leave out the first and last, which would be cut off, so they keep four between them.
	const ticks = limitTicks(rawTicks, isMobileBreakout ? 6 : isMobileCompact ? 3 : 6);

	const formatTime = (time: number) => formatDate(toTZDate(time), "HH:mm");
	const formatXTick = (time: number) => {
		if (xAxisMode !== "windowed") {
			return formatTime(time);
		}

		return time === xMax ? t(($) => $.live.chart.now) : formatMsToDistanceString(xMax - time, i18n.language);
	};
	const formatYValue = (value: number) =>
		formatExposureValue(value, unit as ExposureUnit, defaultFractionDigits, fractionDigitsPerUnit);

	// Pre-calculate values to ensure the Area's gradient bounding box perfectly matches
	const dataValues = transformedData.map((point) => point.value);
	const maxDataValue = dataValues.length > 0 ? Math.max(...dataValues) : maxY;

	// Phones show the picked point, or the latest one, above the chart instead of in a tooltip
	const shownIndex = scrub.activeIndex ?? transformedData.length - 1;
	const shownPoint = transformedData[shownIndex];
	const shownDangerLevel =
		shownPoint === undefined
			? null
			: normalizeDangerLevelForPeakForLineChart(
					getDangerLevel(shownPoint.value, warning, dangerThreshold),
					usePeakData,
				);

	const chart = (
		<ChartContainer
			config={chartConfig}
			className={cn(
				"h-full w-full",
				chartContainerClassName,
				compact && "!aspect-auto",
				isMobileBreakout && (compact ? SCRUB_COMPACT_CHART_HEIGHT_CLASSNAME : SCRUB_CHART_HEIGHT_CLASSNAME),
			)}
		>
			<ComposedChart
				accessibilityLayer={true}
				data={transformedData}
				{...scrub.chartProps}
				margin={
					isMobileBreakout
						? { left: 0, right: 0, top: 12, bottom: compact ? 4 : 0 }
						: compact
							? undefined
							: {
									left: 12,
									right: 8,
									top: 12,
								}
				}
			>
				{!isMobileBreakout && (
					<CartesianGrid vertical={true} stroke="var(--color-muted-foreground)" strokeOpacity={0.3} />
				)}
				<XAxis
					dataKey="time"
					type="number"
					domain={[xMin, xMax]}
					ticks={ticks}
					interval={0}
					allowDataOverflow={true}
					tickLine={false}
					axisLine={false}
					tickMargin={isMobileBreakout ? 8 : 12}
					tickFormatter={formatXTick}
					tick={(props) =>
						isMobileBreakout ? (
							<ScrubXAxisTick {...props} />
						) : (
							<CustomXAxisTick {...props} variant={variant} xMin={xMin} xMax={xMax} />
						)
					}
				/>
				<YAxis
					dataKey="value"
					domain={[minY, maxY]}
					ticks={yTicks}
					// Overridden ticks are already spaced for the chart, so don't let recharts drop any of them
					interval={yTicksOverride ? 0 : undefined}
					tickFormatter={formatYValue}
					{...(isMobileBreakout
						? SCRUB_Y_AXIS_PROPS
						: {
								width: yAxisWidth,
								tickLine: false,
								axisLine: false,
								tick: {
									className: compact ? "text-xs" : "text-sm",
									fill: "var(--color-muted-foreground)",
								},
							})}
					label={
						compact || isMobileBreakout
							? undefined
							: {
									value: t(($) => $.exposures.units[unit]),
									position: unitLabelPosition === "top" ? "insideTopLeft" : "inside",
									// The label is centered in the axis, so this keeps it at the left edge whatever the width
									dx: unitLabelPosition === "top" ? 50 : -yAxisWidth / 2 - 2,
									dy: unitLabelPosition === "top" ? -16 : 0,
									angle: unitLabelPosition === "top" ? 0 : -90,
									fontSize: unitLabelPosition === "top" ? 10 : undefined,
									className: unitLabelPosition === "top" ? "mr-4" : "text-lg mr-4",
									fill: "var(--color-muted-foreground)",
								}
					}
				/>
				{isMobileBreakout ? <ChartScrubTracker /> : <ExposureTooltip unit={unit} />}
				<defs>
					{/* Gradient for line stroke */}
					<linearGradient id={`${id}-line`} x1="0" y1="0" x2="0" y2="1">
						<ExposureLineChartGradientStops
							values={dataValues}
							warningThreshold={warning}
							dangerThreshold={dangerThreshold}
							usePeakData={usePeakData}
						/>
					</linearGradient>

					{showArea && (
						<>
							<linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
								<ExposureLineChartGradientStops
									values={[minY, maxDataValue]}
									warningThreshold={warning}
									dangerThreshold={dangerThreshold}
									usePeakData={usePeakData}
								/>
							</linearGradient>
							<linearGradient id={`${id}-fade-gradient`} x1="0" y1="0" x2="0" y2="1">
								<stop offset="0%" stopColor="white" stopOpacity={1} />
								<stop offset="50%" stopColor="white" stopOpacity={1} />
								<stop offset="100%" stopColor="white" stopOpacity={0} />
							</linearGradient>
							<mask id={`${id}-fade-mask`}>
								<rect x="0" y="0" width="100%" height="100%" fill={`url(#${id}-fade-gradient)`} />
							</mask>
						</>
					)}
				</defs>
				{showArea && (
					<Area
						dataKey="value"
						type={lineType}
						fill={`url(#${id}-area)`}
						stroke="none"
						baseValue={minY}
						fillOpacity={0.25}
						mask={`url(#${id}-fade-mask)`}
						isAnimationActive={false}
						animationDuration={0}
					/>
				)}
				<Line
					dataKey="value"
					type={lineType}
					stroke={`url(#${id}-line)`}
					strokeWidth={lineStrokeWidth}
					isAnimationActive={false}
					animationDuration={0}
					dot={false}
					activeDot={
						isMobileBreakout
							? false
							: (props) => (
									<ExposureDot
										{...props}
										warning={warning}
										danger={dangerThreshold}
										isPeak={usePeakData}
									/>
								)
					}
				/>
				{children}
				{scrub.activeIndex !== null && shownPoint && shownDangerLevel && (
					<>
						<ChartScrubCursor x={shownPoint.time} xEnd={xMax} />
						<ChartScrubDot
							x={shownPoint.time}
							y={shownPoint.value}
							color={dangerlevelStyles[shownDangerLevel].color}
						/>
					</>
				)}
				{showLegend && (
					<Legend
						verticalAlign="bottom"
						align="left"
						content={() => (
							<div style={{ marginLeft: isMobileBreakout ? 20 : yAxisWidth }}>
								<ThresholdLegend
									items={[
										{
											dangerLevel: "danger",
											color: `var(--${DangerLevels.danger.color})`,
										},
										{
											dangerLevel: "warning",
											color: `var(--${DangerLevels.warning.color})`,
										},
									]}
								/>
							</div>
						)}
					/>
				)}
			</ComposedChart>
		</ChartContainer>
	);

	if (!(isMobileBreakout && shownPoint)) {
		return chart;
	}

	return (
		<div className="flex w-full flex-col">
			<ChartScrubHeader
				title={title}
				dangerLevel={shownDangerLevel}
				caption={
					scrub.activeIndex === null && xAxisMode === "windowed"
						? t(($) => $.live.chart.now)
						: formatTime(shownPoint.time)
				}
			>
				<ChartScrubValue
					value={formatExposureValue(shownPoint.value, unit)}
					unit={t(($) => $.exposures.units[unit])}
				/>
			</ChartScrubHeader>
			{chart}
		</div>
	);
}

type CustomXAxisTickProps = XAxisTickContentProps & {
	xMin: number;
	xMax: number;
	variant: LineChartVariant;
};

function CustomXAxisTick({ x, y, xMin, xMax, payload, index, tickFormatter, variant }: CustomXAxisTickProps) {
	const value: number = payload.value ?? 0;

	const isFirst = value === xMin;
	const isLast = value === xMax;
	const label = tickFormatter ? tickFormatter(value, index) : value;

	return (
		<text
			x={x}
			y={y}
			textAnchor={isFirst ? "start" : isLast ? "end" : "middle"}
			fill="var(--color-muted-foreground)"
			fontSize={12}
			className={cn(variant === "compact" ? "text-xs" : "text-sm")}
		>
			{label}
		</text>
	);
}

function formatMsToDistanceString(msDiff: number, language: string) {
	const minutes = Math.round(msDiff / (1000 * 60));

	const now = getNow();
	const date = addMinutes(now, -minutes);

	const locale = getLocale(language);

	return formatDistanceToNowStrict(date, {
		locale,
	}).replace("en", "1");
}

function buildTicks(xAxisMode: XAxisMode, minTime: Date, maxTime: Date) {
	const min = minTime.getTime();
	const max = maxTime.getTime();

	if (xAxisMode === "windowed") {
		const ticks = [min, max];

		const current = new TZDate(minTime);

		while (current < maxTime) {
			const t = current.getTime();

			if (t > min) {
				ticks.push(t);
			}

			current.setHours(current.getHours() + 1);
		}

		ticks.sort((a, b) => a - b);

		return ticks;
	}

	const current = new TZDate(minTime);
	current.setMinutes(0, 0, 0);

	const end = new TZDate(maxTime);
	end.setMinutes(0, 0, 0);

	const ticks = [];

	while (current <= end) {
		ticks.push(current.getTime());
		current.setHours(current.getHours() + 1);
	}

	return ticks;
}

function limitTicks(ticks: Array<number>, maxTicks: number) {
	if (ticks.length <= maxTicks) {
		return ticks;
	}

	const step = Math.ceil((ticks.length - 1) / (maxTicks - 1));
	const result = ticks.filter((_, i) => i % step === 0);

	if (result[0] !== ticks[0]) {
		result.unshift(ticks[0]);
	}

	if (result[result.length - 1] !== ticks[ticks.length - 1]) {
		result.push(ticks[ticks.length - 1]);
	}

	return result;
}
