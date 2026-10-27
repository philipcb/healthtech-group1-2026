import { CollapsedYAxisTick } from "@/components/exposure-line-chart/collapsed-y-axis-tick.tsx";
import { COLLAPSED_Y_AXIS_WIDTH } from "@/components/exposure-line-chart/collapsed-y-axis-width.ts";
import { getGroupUnitLabel } from "@/features/aggregated-exposure/model/groups.ts";
import { formatTrendTick, getTrendTicks } from "@/features/aggregated-exposure/model/trend-chart.ts";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import { useIsMobile } from "@/hooks/use-mobile.ts";
import type { ExposureUnit } from "@/lib/exposures.ts";
import { useTranslation } from "react-i18next";
import type { XAxisProps, YAxisProps, YAxisTickContentProps } from "recharts";

const Y_AXIS_WIDTH = 60;
const AXIS_TICK = { className: "text-sm", fill: "var(--color-muted-foreground)" };

// Spread into `XAxis` and `YAxis`, since Recharts needs them as direct children of the chart
export function useTrendAxes({
	timestamps,
	unit,
	yDomain,
}: {
	timestamps: Array<number>;
	unit: ExposureUnit;
	yDomain: [number, number];
}) {
	const { t } = useTranslation();
	const formatDate = useFormatDate();
	const isMobile = useIsMobile();
	const { ticks, showsMonths } = getTrendTicks(timestamps);
	const formatYValue = (value: number) => formatTrendTick(value, unit);

	const xAxisProps: XAxisProps = {
		dataKey: "timestamp",
		type: "number",
		scale: "time",
		domain: ["dataMin", "dataMax"],
		ticks,
		tickFormatter: (timestamp: number) => formatDate(timestamp, showsMonths ? "LLL" : "dd.MM"),
		tickLine: false,
		axisLine: false,
		tickMargin: 8,
		interval: "preserveStartEnd",
		minTickGap: 16,
		tick: AXIS_TICK,
	};

	const yAxisProps: YAxisProps = {
		width: isMobile ? COLLAPSED_Y_AXIS_WIDTH : Y_AXIS_WIDTH,
		tickLine: false,
		axisLine: false,
		tick: isMobile
			? (tickProps: YAxisTickContentProps) => (
					<CollapsedYAxisTick y={tickProps.y} label={formatYValue(Number(tickProps.payload.value))} />
				)
			: AXIS_TICK,
		domain: yDomain,
		tickFormatter: formatYValue,
		label: isMobile
			? undefined
			: {
					value: getGroupUnitLabel(unit, t),
					position: "inside",
					dx: -32,
					angle: -90,
					className: "text-base",
					fill: "var(--color-muted-foreground)",
				},
	};

	return {
		xAxisProps,
		yAxisProps,
		isMobile,
		formatDay: (date: Date) => formatDate(date, "EEEE d. MMMM yyyy"),
	};
}
