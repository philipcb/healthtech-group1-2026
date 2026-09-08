import { CalendarWidget } from "@/features/calendar-widget/calendar-widget.tsx";
import { ExposureLineChartCardSkeleton } from "@/features/exposure-line-chart-card/base-exposure-line-chart-card.tsx";
import { ExposureGraphEmptyState } from "@/features/statistic-card.tsx";
import { WeekWidget } from "@/features/week-widget/week-widget.tsx";
import type { useExposureChartData } from "@/hooks/use-exposure-chart-data.ts";
import type { ReactNode } from "react";

type ExposureChartData = ReturnType<typeof useExposureChartData>;

interface Props
	extends Pick<
		ExposureChartData,
		"isLoading" | "isError" | "view" | "date" | "data" | "calendarData" | "minHour" | "maxHour"
	> {
	locale: string;
	children: ReactNode;
}


export function ExposureChartView({
	isLoading,
	isError,
	view,
	date,
	data,
	calendarData,
	minHour,
	maxHour,
	locale,
	children,
}: Props) {
	if (isLoading) {
		return <ExposureLineChartCardSkeleton />;
	}

	if (isError) {
		return <ExposureGraphEmptyState date={date} locale={locale} />;
	}

	if (view === "month") {
		return <CalendarWidget selectedDay={date} data={calendarData} />;
	}

	if (view === "week") {
		return <WeekWidget dayStartHour={minHour} dayEndHour={maxHour} data={calendarData} />;
	}

	if (!data || data.length === 0) {
		return <ExposureGraphEmptyState date={date} locale={locale} />;
	}

	return <>{children}</>;
}
