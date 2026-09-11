import { ExposureSlider } from "@/components/exposure-slider.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useDate } from "@/features/date-picker/use-date.ts";
import { DustExposureLineChartCard } from "@/features/exposure-line-chart-card/dust-exposure-line-chart-card.tsx";
import { ExposureStatisticsSection } from "@/features/statistic-card.tsx";
import { DustTrendLineChartCard } from "@/features/trend-line-chart-card/dust-trend-line-chart-card.tsx";
import { ExposureChartCard } from "@/features/user-details/exposure-chart-card.tsx";
import { useView } from "@/features/views/use-view.ts";
import { WeekWidget } from "@/features/week-widget/week-widget.tsx";
import { useExposureChartData } from "@/hooks/use-exposure-chart-data.ts";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import { exposureOverviewQueryOptions, exposureQueryOptions } from "@/lib/api.ts";
import { getDangerLevel } from "@/lib/danger-levels.ts";
import type { ExposureDto } from "@/lib/dto/exposure.ts";
import type { UserWithStatusDto } from "@/lib/dto/user.ts";
import { buildExposureOverviewQuery, buildExposureQuery } from "@/lib/exposure-query-utils.ts";
import {
	type DustField,
	defaultDustField,
	dustFields,
	type Exposure,
	parseAsDustField,
	parseAsExposureUnit,
} from "@/lib/exposures.ts";
import { getThreshold } from "@/lib/thresholds.ts";
import { mapOverviewDataToTimeBucketStatuses } from "@/lib/time-bucket-utils.ts";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { useTranslation } from "react-i18next";

export function DustUserChart({ selectedUser }: { selectedUser: UserWithStatusDto }) {
	const { view } = useView();
	const { t } = useTranslation();
	const formatDate = useFormatDate();
	const exposure: Exposure = "dust";
	const [dustField, setDustField] = useQueryState<DustField>(
		"dustField",
		parseAsDustField.withDefault(defaultDustField),
	);
	const [dustUnit] = useQueryState("unit", parseAsExposureUnit.withDefault("ug"));

	const { date } = useDate();

	const { data, isLoading, isError, threshold, latestPoint, maxPoint, averageValue, minHour, maxHour } =
		useExposureChartData(exposure, { userId: selectedUser.id, dustField });

	const { data: overviewResponse } = useQuery(
		exposureOverviewQueryOptions({
			query: buildExposureOverviewQuery([exposure], view, date),
			userId: selectedUser.id,
		}),
	);

	const dustPm1TwaThreshold = getThreshold(exposure, "pm1_twa");
	const dustPm25TwaThreshold = getThreshold(exposure, "pm25_twa");
	const dustPm4TwaThreshold = getThreshold(exposure, "pm4_twa");
	const dustPm10TwaThreshold = getThreshold(exposure, "pm10_twa");

	const [dustTwa1Result, dustTwa25Result, dustTwa4Result, dustTwa10Result] = useQueries({
		queries: [
			exposureQueryOptions({
				exposure,
				query: buildExposureQuery(exposure, view, date, {
					granularity: "day",
					aggregationFunction: "avg",
					field: "pm1_twa",
				}),
				userId: selectedUser.id,
			}),
			exposureQueryOptions({
				exposure,
				query: buildExposureQuery(exposure, view, date, {
					granularity: "day",
					aggregationFunction: "avg",
					field: "pm25_twa",
				}),
				userId: selectedUser.id,
			}),
			exposureQueryOptions({
				exposure,
				query: buildExposureQuery(exposure, view, date, {
					granularity: "day",
					aggregationFunction: "avg",
					field: "pm4_twa",
				}),
				userId: selectedUser.id,
			}),
			exposureQueryOptions({
				exposure,
				query: buildExposureQuery(exposure, view, date, {
					granularity: "day",
					aggregationFunction: "avg",
					field: "pm10_twa",
				}),
				userId: selectedUser.id,
			}),
		],
	});

	const avgPm1Twa = getAvgValue(dustTwa1Result.data?.data ?? []);
	const avgPm25Twa = getAvgValue(dustTwa25Result.data?.data ?? []);
	const avgPm4Twa = getAvgValue(dustTwa4Result.data?.data ?? []);
	const avgPm10Twa = getAvgValue(dustTwa10Result.data?.data ?? []);

	const showTrendLineChart = view === "month" || view === "week";
	const showDustStatistics = view === "day";

	return (
		<div className="flex max-w-4xl flex-col gap-4">
			<Tabs value={dustField} onValueChange={(value) => setDustField(value as DustField)}>
				<TabsList>
					{dustFields.map((field) => (
						<TabsTrigger key={field} value={field}>
							{t(($) => $.exposures.dustFields[field])}
						</TabsTrigger>
					))}
				</TabsList>
			</Tabs>

			<ExposureChartCard
				isLoading={isLoading}
				isError={isError}
				data={data}
				selectedDate={date}
				isExposure={true}
			>
				{view === "week" ? (
					<WeekWidget
						dayStartHour={minHour}
						dayEndHour={maxHour}
						data={mapOverviewDataToTimeBucketStatuses(overviewResponse?.data ?? [])}
					/>
				) : (
					<DustExposureLineChartCard userId={selectedUser.id} />
				)}
			</ExposureChartCard>

			{showDustStatistics && (
				<ExposureStatisticsSection
					isLoading={isLoading}
					isEmpty={isError || !data?.length}
					averageValue={averageValue}
					maxValue={maxPoint?.value ?? null}
					maxTime={maxPoint?.time ?? null}
					latestValue={latestPoint?.value ?? null}
					warningThreshold={threshold.warning}
					dangerThreshold={threshold.danger}
					unit={dustUnit}
					formatTime={(time) => formatDate(time, "HH:mm")}
				/>
			)}

			<Card className="w-full">
				<CardHeader>
					<CardTitle>
						{t(($) => $.exposureSlider.title, {
							view: t(($) => $.views[view]).toLowerCase(),
						})}
					</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-row flex-wrap">
					<ExposureSlider
						className="flex-1"
						label={t(($) => $.exposures.dustFields.pm1_twa)}
						value={avgPm1Twa}
						exposure={exposure}
						unitLabel="ug"
						dangerLevel={getDangerLevel(avgPm1Twa, dustPm1TwaThreshold.warning, dustPm1TwaThreshold.danger)}
					/>
					<ExposureSlider
						className="flex-1"
						label={t(($) => $.exposures.dustFields.pm25_twa)}
						value={avgPm25Twa}
						exposure={exposure}
						unitLabel="ug"
						dangerLevel={getDangerLevel(
							avgPm25Twa,
							dustPm25TwaThreshold.warning,
							dustPm25TwaThreshold.danger,
						)}
					/>
					<ExposureSlider
						className="flex-1"
						label={t(($) => $.exposures.dustFields.pm4_twa)}
						value={avgPm4Twa}
						exposure={exposure}
						unitLabel="ug"
						dangerLevel={getDangerLevel(avgPm4Twa, dustPm4TwaThreshold.warning, dustPm4TwaThreshold.danger)}
					/>
					<ExposureSlider
						className="flex-1"
						label={t(($) => $.exposures.dustFields.pm10_twa)}
						value={avgPm10Twa}
						exposure={exposure}
						unitLabel="ug"
						dangerLevel={getDangerLevel(
							avgPm10Twa,
							dustPm10TwaThreshold.warning,
							dustPm10TwaThreshold.danger,
						)}
					/>
				</CardContent>
			</Card>

			{showTrendLineChart && <DustTrendLineChartCard unit={dustUnit} userId={selectedUser.id} />}
		</div>
	);
}

function getAvgValue(data: Array<ExposureDto>): number {
	if (data.length === 0) {
		return 0;
	}

	const sum = data.reduce((acc, point) => acc + point.value, 0);
	return sum / data.length;
}
