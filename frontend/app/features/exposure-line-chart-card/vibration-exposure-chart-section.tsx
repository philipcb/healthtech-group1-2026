import { ExposureChartView } from "@/features/exposure-line-chart-card/exposure-chart-view.tsx";
import VibrationExposureLineChartCard from "@/features/exposure-line-chart-card/vibration-exposure-line-chart-card.tsx";
import { useExposureChartData } from "@/hooks/use-exposure-chart-data.ts";
import type { Exposure } from "@/lib/exposures.ts";
import { useTranslation } from "react-i18next";

export function VibrationExposureChartSection() {
	const { i18n } = useTranslation();

	const exposure: Exposure = "vibration";

	const { view, date, data, isLoading, isError, calendarData, minHour, maxHour } = useExposureChartData(exposure);

	return (
		<ExposureChartView
			isLoading={isLoading}
			isError={isError}
			view={view}
			date={date}
			data={data}
			calendarData={calendarData}
			minHour={minHour}
			maxHour={maxHour}
			locale={i18n.language}
		>
			<VibrationExposureLineChartCard />
		</ExposureChartView>
	);
}
