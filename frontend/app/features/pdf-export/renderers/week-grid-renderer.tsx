import type { CollectedPage } from "@/features/pdf-export/pdf-page-spec.ts";
import { PAGE_KEYS } from "@/features/pdf-export/renderers/page-keys.ts";
import { TIMEZONE } from "@/i18n/locale.ts";
import { exposureQueryOptions } from "@/lib/api.ts";
import type { DangerLevel } from "@/lib/danger-levels.ts";
import { type Aggregation, Aggregations } from "@/lib/dto/exposure.ts";
import { buildExposureQuery, getSummaryGranularity } from "@/lib/exposure-query-utils.ts";
import { getHourDomain } from "@/lib/exposure-time-domain.ts";
import { defaultDustField, type Exposure, parseAsDustField } from "@/lib/exposures.ts";
import { calculateSummaryCounts } from "@/lib/time-bucket-utils.ts";
import { useQuery } from "@tanstack/react-query";
import { addDays, eachDayOfInterval, setHours, startOfDay, startOfHour, startOfWeek } from "date-fns";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useEffect, useRef } from "react";

/** Collects a week's hourly exposure data and summary for vector rendering. */
export function WeekGridRenderer({
	exposure,
	date,
	userId,
	onPageReady,
}: {
	exposure: Exposure;
	date: Date;
	userId: string;
	onPageReady: (page: CollectedPage) => void;
}) {
	const tzDate = TIMEZONE(date);
	const granularity = getSummaryGranularity(exposure);
	const [dustField] = useQueryState("dustField", parseAsDustField.withDefault(defaultDustField));
	const parseAsAggregation = parseAsStringLiteral(Aggregations);
	const [aggregation] = useQueryState<Aggregation>("aggregation", parseAsAggregation.withDefault("average"));
	const peakAggregation = aggregation === "peak";
	const gridQuery = useQuery(
		exposureQueryOptions({
			exposure,
			query: buildExposureQuery(exposure, "week", tzDate, {
				field: exposure === "dust" ? "pm1_twa" : undefined,
				usePeakAggregation: false,
			}),
			userId,
		}),
	);
	const summaryQuery = useQuery(
		exposureQueryOptions({
			exposure,
			query: buildExposureQuery(exposure, "week", tzDate, {
				field: exposure === "dust" ? dustField : undefined,
				usePeakAggregation: peakAggregation,
				granularity,
			}),
			userId,
		}),
	);

	const isLoading = gridQuery.isLoading || summaryQuery.isLoading;
	const gridData = gridQuery.data?.data ?? [];
	const summaryData = summaryQuery.data?.data ?? [];
	const hourDomain = gridQuery.data?.hourDomain;
	const { minHour, maxHour } = getHourDomain(
		hourDomain,
		gridData.map((point) => point.time),
		"week",
	);
	const hasReportedRef = useRef(false);
	const onPageReadyRef = useRef(onPageReady);
	onPageReadyRef.current = onPageReady;

	useEffect(() => {
		if (isLoading || hasReportedRef.current) return;
		hasReportedRef.current = true;

		const weekStart = startOfWeek(tzDate, { weekStartsOn: 1, in: TIMEZONE });
		const weekDates = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
		const hours = Array.from({ length: maxHour - minHour + 1 }, (_, index) => minHour + index);
		const dangerLevelByHour = new Map<number, DangerLevel>();
		for (const bucket of gridData) dangerLevelByHour.set(startOfHour(bucket.time).getTime(), bucket.dangerLevel);

		onPageReadyRef.current({
			key: PAGE_KEYS.single(exposure),
			spec: {
				kind: "week-grid",
				exposure,
				page: {
					hours,
					days: weekDates.map((weekDate) => ({
						date: weekDate,
						dangerLevels: hours.map((hour) => {
							const slot = setHours(startOfDay(weekDate), hour);
							return dangerLevelByHour.get(startOfHour(slot).getTime()) ?? null;
						}),
					})),
					summary: calculateSummaryCounts(summaryData, {
						exposure,
						peakAggregation,
						granularity,
					}),
				},
			},
		});
	}, [isLoading, tzDate, minHour, maxHour, gridData, summaryData, exposure, granularity, peakAggregation]);

	return null;
}
