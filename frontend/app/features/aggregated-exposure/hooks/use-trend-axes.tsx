import { ScrubXAxisTick } from "@/components/chart-scrub.tsx";
import { getGroupUnitLabel } from "@/features/aggregated-exposure/model/groups.ts";
import { formatTrendTick, getHourTicks, getTrendTicks } from "@/features/aggregated-exposure/model/trend-chart.ts";
import { SCRUB_Y_AXIS_PROPS } from "@/hooks/use-chart-scrub.ts";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import { useIsMobile } from "@/hooks/use-mobile.ts";
import type { ExposureUnit } from "@/lib/exposures.ts";
import { useTranslation } from "react-i18next";
import type { XAxisProps, YAxisProps } from "recharts";

const Y_AXIS_WIDTH = 60;
const AXIS_TICK = { className: "text-sm", fill: "var(--color-muted-foreground)" };

// Spread into `XAxis` and `YAxis`, since Recharts needs them as direct children of the chart
export function useTrendAxes({
	timestamps,
	unit,
	yDomain,
	day,
}: {
	timestamps: Array<number>;
	unit: ExposureUnit;
	yDomain: [number, number];
	/** For one day's hourly points, which the axis shows from midnight to midnight in Norwegian time */
	day?: Date;
}) {
	const { t } = useTranslation();
	const formatDate = useFormatDate();
	const isMobile = useIsMobile();
	const { ticks, showsMonths } = getTrendTicks(timestamps);
	const hourTicks = day === undefined ? undefined : getHourTicks(day);
	// Phones show only the hours with data, so the line fills the width like the other phone charts
	const firstTime = timestamps[0] ?? 0;
	const lastTime = timestamps.at(-1) ?? 0;
	const showsWholeDay = hourTicks !== undefined && !isMobile;
	const formatYValue = (value: number) => formatTrendTick(value, unit);
	const formatDay = (date: Date) => formatDate(date, "EEEE d. MMMM yyyy");

	const xAxisProps: XAxisProps = {
		dataKey: "timestamp",
		type: "number",
		scale: "time",
		domain: showsWholeDay ? [hourTicks[0], hourTicks[hourTicks.length - 1]] : ["dataMin", "dataMax"],
		// Every whole hour on phones, which Recharts thins out to what fits, since a working day is only a few hours
		ticks:
			isMobile && day !== undefined
				? getHourTicks(day, 1).filter((tick) => tick >= firstTime && tick <= lastTime)
				: (hourTicks ?? ticks),
		tickFormatter: (timestamp: number) =>
			formatDate(timestamp, hourTicks === undefined ? (showsMonths ? "LLL" : "dd.MM") : "HH:mm"),
		tickLine: false,
		axisLine: false,
		tickMargin: 8,
		interval: showsWholeDay ? 0 : "preserveStartEnd",
		minTickGap: isMobile ? 24 : 16,
		tick: isMobile ? (props) => <ScrubXAxisTick {...props} /> : AXIS_TICK,
	};

	const yAxisProps: YAxisProps = {
		domain: yDomain,
		tickFormatter: formatYValue,
		// Phones name the unit in the figure above the chart
		...(isMobile
			? SCRUB_Y_AXIS_PROPS
			: {
					width: Y_AXIS_WIDTH,
					tickLine: false,
					axisLine: false,
					tick: AXIS_TICK,
					label: {
						value: getGroupUnitLabel(unit, t),
						position: "inside",
						dx: -32,
						angle: -90,
						className: "text-base",
						fill: "var(--color-muted-foreground)",
					},
				}),
	};

	return {
		xAxisProps,
		yAxisProps,
		isMobile,
		// An hour's tooltip also names the time
		formatDay: (date: Date) =>
			hourTicks === undefined
				? formatDay(date)
				: t(($) => $.aggregatedExposure.group.hourTooltip, {
						time: formatDate(date, "HH:mm"),
						day: formatDay(date),
					}),
	};
}
