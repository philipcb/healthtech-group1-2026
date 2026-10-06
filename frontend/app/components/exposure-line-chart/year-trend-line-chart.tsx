"use client";

import { ExposureLineChartGradientStops } from "@/components/exposure-line-chart/exposure-line-chart-gradient-stops.tsx";
import { ThresholdLine } from "@/components/exposure-line-chart/threshold-line.tsx";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart.tsx";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import type { ExposureDto, ExposureTypeField } from "@/lib/dto/exposure.ts";
import type { Exposure, ExposureUnit } from "@/lib/exposures.ts";
import { getThreshold } from "@/lib/thresholds.ts";
import { formatExposureValue } from "@/lib/utils.ts";
import type { TZDate } from "@date-fns/tz";
import { eachDayOfInterval, eachMonthOfInterval } from "date-fns";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts";

const chartConfig = {
	desktop: { label: "Desktop", color: "var(--chart-1)" },
} satisfies ChartConfig;

/** Calendar day (Oslo time) as "YYYY-MM-DD" - same key format YearSummaryRenderer uses for registered days. */
const getDayKey = (date: Date) => date.toLocaleDateString("en-CA", { timeZone: "Europe/Oslo" });

export interface YearTrendLineChartProps {
	data: Array<ExposureDto>;
	periodStart: TZDate;
	periodEnd: TZDate;
	minY: number;
	maxY: number;
	unit: ExposureUnit;
	exposure: Exposure;
	dustField?: ExposureTypeField;
	/** PM1/PM2.5/PM10/Noise use the daily average (value); Vibration uses the daily peak (peakValue). */
	usePeakData?: boolean;
}

/**
 * One line per metric, one point per day, X-axis ticked by month instead of
 * by hour — built specifically for the year/period summary trend charts.
 *
 * Deliberately NOT a variant of ExposureLineChart: that component's tick
 * logic (buildTicks/CustomXAxisTick) assumes an hour-resolution domain used
 * by the live day/week charts, and mixing month-level ticks into it risks
 * affecting those. This component reuses ThresholdLine and
 * ExposureLineChartGradientStops unchanged, so the visual style (colour-
 * changing line, filled zone area, dashed threshold lines) stays identical.
 */
export function YearTrendLineChart({
	data,
	periodStart,
	periodEnd,
	minY,
	maxY,
	unit,
	exposure,
	dustField,
	usePeakData = false,
}: YearTrendLineChartProps) {
	const id = useId();
	const { t } = useTranslation();
	const formatDate = useFormatDate();
	const { warning, danger, peakDanger } = getThreshold(exposure, dustField);
	const dangerThreshold = usePeakData && peakDanger ? peakDanger : danger;

	const valueByDay = new Map<string, number>();
	for (const point of data) {
		valueByDay.set(getDayKey(point.time), usePeakData ? (point.peakValue ?? point.value) : point.value);
	}

	// One point for EVERY day in the period. Days without measurements count as 0,
	// so the chart never implies exposure on a day nothing was registered.
	const transformedData = eachDayOfInterval({ start: periodStart, end: periodEnd }).map((day) => ({
		time: day.getTime(),
		value: valueByDay.get(getDayKey(day)) ?? 0,
	}));

	const xMin = periodStart.getTime();
	const xMax = periodEnd.getTime();

	// TODO (future, multi-year periods): once periods can span >1 year, thin
	// these ticks (e.g. every 3rd/4th month, or switch to yearly ticks) —
	// see the comment on TREND_CHART monthly-only assumption in
	// pdf-chart-renderer.tsx's YearTrendChartsRenderer for where to extend this.
	const monthTicks = eachMonthOfInterval({ start: periodStart, end: periodEnd }).map((month) => month.getTime());

	const formatYValue = (value: number) =>
		formatExposureValue(value, unit, exposure === "dust" ? 1 : 0, exposure === "dust" ? { mg: 4 } : { mg: 3 });
	const formatXTick = (time: number) => formatDate(new Date(time), "MMM");

	const dataValues = transformedData.map((point) => point.value);

	return (
		<ChartContainer config={chartConfig} className="h-full w-full">
			<ComposedChart data={transformedData} margin={{ left: 12, right: 8, top: 12 }}>
				<CartesianGrid vertical={true} stroke="var(--color-muted-foreground)" strokeOpacity={0.3} />
				<XAxis
					dataKey="time"
					type="number"
					domain={[xMin, xMax]}
					ticks={monthTicks}
					tickFormatter={formatXTick}
					tickLine={false}
					axisLine={false}
					tickMargin={12}
				/>
				<YAxis
					dataKey="value"
					tickLine={false}
					axisLine={false}
					domain={[minY, maxY]}
					tickFormatter={formatYValue}
					className="text-sm"
					label={{
						value: t(($) => $.exposures.units[unit]),
						position: "inside",
						dx: -32,
						angle: -90,
						className: "text-lg mr-4",
						fill: "var(--color-muted-foreground)",
					}}
				/>
				<defs>
					<linearGradient id={`${id}-line`} x1="0" y1="0" x2="0" y2="1">
						<ExposureLineChartGradientStops
							values={dataValues}
							warningThreshold={warning}
							dangerThreshold={dangerThreshold}
							usePeakData={usePeakData}
						/>
					</linearGradient>
					<linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
						<ExposureLineChartGradientStops
							values={[minY, ...dataValues]}
							warningThreshold={warning}
							dangerThreshold={dangerThreshold}
							usePeakData={usePeakData}
						/>
					</linearGradient>
				</defs>
				<Area
					dataKey="value"
					type="linear"
					fill={`url(#${id}-area)`}
					stroke="none"
					baseValue={minY}
					fillOpacity={0.25}
					isAnimationActive={false}
				/>
				<Line
					dataKey="value"
					type="linear"
					stroke={`url(#${id}-line)`}
					strokeWidth={1}
					isAnimationActive={false}
					dot={false}
				/>
				<ThresholdLine y={dangerThreshold} dangerLevel="danger" />
				<ThresholdLine y={warning} dangerLevel="warning" />
			</ComposedChart>
		</ChartContainer>
	);
}
