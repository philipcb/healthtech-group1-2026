import { CalendarWidget } from "@/features/calendar-widget/calendar-widget.tsx";
import { ExposureLineChartCardSkeleton } from "@/features/exposure-line-chart-card/base-exposure-line-chart-card.tsx";
import VibrationExposureLineChartCard from "@/features/exposure-line-chart-card/vibration-exposure-line-chart-card.tsx";
import { ExposureGraphEmptyState, ExposureStatisticsSection } from "@/features/statistic-card.tsx";
import { VibrationTrendLineChartCard } from "@/features/trend-line-chart-card/vibration-trend-line-chart-card.tsx";
import { WeekWidget } from "@/features/week-widget/week-widget.tsx";
import { useExposureChartData } from "@/hooks/use-exposure-chart-data.ts";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import type { Exposure } from "@/lib/exposures.ts";
import { useTranslation } from "react-i18next";

export default function Vibration() {
	const { i18n } = useTranslation();
	const formatDate = useFormatDate();

	const exposure: Exposure = "vibration";

	const { view, date, data, isLoading, isError, threshold, maxPoint, calendarData, minHour, maxHour } =
		useExposureChartData(exposure);

	const showTrendLineChart = view === "month" || view === "week";
	const showVibrationStatistics = view === "day";

	return (
		<div className="flex flex-col gap-8">
			<div className="flex h-full w-full flex-col-reverse gap-4 md:flex-row">
				<div className="flex flex-1 flex-col gap-4">
					{isLoading ? (
						<ExposureLineChartCardSkeleton />
					) : isError ? (
						<ExposureGraphEmptyState date={date} locale={i18n.language} />
					) : view === "month" ? (
						<CalendarWidget selectedDay={date} data={calendarData} />
					) : view === "week" ? (
						<WeekWidget dayStartHour={minHour} dayEndHour={maxHour} data={calendarData} />
					) : !data || data.length === 0 ? (
						<ExposureGraphEmptyState date={date} locale={i18n.language} />
					) : (
						<VibrationExposureLineChartCard />
					)}

					{showVibrationStatistics && (
						<ExposureStatisticsSection
							isLoading={isLoading}
							isEmpty={isError || !data?.length}
							averageValue={null}
							maxValue={maxPoint?.value ?? null}
							maxTime={null}
							latestValue={null}
							warningThreshold={threshold.warning}
							dangerThreshold={threshold.danger}
							unit="points"
							formatTime={(time) => formatDate(time, "HH:mm")}
						/>
					)}
				</div>
			</div>
			{showTrendLineChart && <VibrationTrendLineChartCard />}
		</div>
	);
}
