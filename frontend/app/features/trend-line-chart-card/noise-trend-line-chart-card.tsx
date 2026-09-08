import { TrendLineChart } from "@/components/exposure-trend-line-chart/trend-line-chart.tsx";
import { exposureQueryOptions } from "@/lib/api.ts";
import { buildExposureQuery } from "@/lib/exposure-query-utils.ts";
import { getExposureYAxisRange } from "@/lib/exposure-y-axis.ts";
import { useQuery } from "@tanstack/react-query";
import { useDate } from "../date-picker/use-date.ts";
import { useUser } from "../user/user-context.tsx";
import { useView } from "../views/use-view.ts";
import { BaseTrendLineChartCard } from "./base-trend-line-chart-card.tsx";
import { toWeeklyMax } from "./trend-line-chart-utils.ts";

interface Props {
	usePeakAggregation?: boolean;
	userId?: string;
}

export function NoiseTrendLineChartCard({ usePeakAggregation, userId }: Props) {
	const { date } = useDate();
	const { view } = useView();
	const { user } = useUser();

	const exposure = "noise";

	const query = buildExposureQuery(exposure, view, date, {
		usePeakAggregation,
	});

	const { data: response } = useQuery(
		exposureQueryOptions({
			exposure: exposure,
			query,
			userId: userId ?? user.id,
		}),
	);

	const granularity = view === "week" ? "day" : "week";

	const rawData = response?.data ?? [];
	const normalizedData = usePeakAggregation ? rawData.map((d) => ({ ...d, value: d.peakValue ?? d.value })) : rawData;

	const data = granularity === "week" ? toWeeklyMax(normalizedData) : normalizedData;

	const { minY, maxY } = getExposureYAxisRange(exposure, data, { usePeakAggregation });

	return (
		<BaseTrendLineChartCard>
			<TrendLineChart
				selectedDate={date}
				granularity={granularity}
				unit="db" //TODO: Should this always use db?
				minY={minY}
				maxY={maxY}
				series={[
					{
						data: data ?? [],
						exposure: exposure,
					},
				]}
				usePeakDangerThreshold={usePeakAggregation === true}
			/>
		</BaseTrendLineChartCard>
	);
}
