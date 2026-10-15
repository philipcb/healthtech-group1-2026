import type { CollectedPage } from "@/features/pdf-export/pdf-page-spec.ts";
import { PAGE_KEYS } from "@/features/pdf-export/renderers/page-keys.ts";
import { TIMEZONE } from "@/i18n/locale.ts";
import { exposureQueryOptions } from "@/lib/api.ts";
import { type Aggregation, Aggregations } from "@/lib/dto/exposure.ts";
import { buildExposureQuery, getSummaryGranularity } from "@/lib/exposure-query-utils.ts";
import { defaultDustField, type Exposure, parseAsDustField } from "@/lib/exposures.ts";
import { getCalendarDays } from "@/lib/pdf/calendar-days.ts";
import { calculateSummaryCounts, mapExposureDataToTimeBucketStatuses } from "@/lib/time-bucket-utils.ts";
import { useQuery } from "@tanstack/react-query";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useEffect, useRef } from "react";

/** Collects a month calendar and its exposure summary for vector rendering. */
export function MonthCalendarRenderer({
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
	const monthDate = TIMEZONE(date);
	const granularity = getSummaryGranularity(exposure);
	const [dustField] = useQueryState("dustField", parseAsDustField.withDefault(defaultDustField));
	const parseAsAggregation = parseAsStringLiteral(Aggregations);
	const [aggregation] = useQueryState<Aggregation>("aggregation", parseAsAggregation.withDefault("average"));
	const usePeakAggregation = aggregation === "peak";
	const dayQuery = useQuery(
		exposureQueryOptions({
			exposure,
			query: buildExposureQuery(exposure, "month", monthDate, {
				field: exposure === "dust" ? dustField : undefined,
				usePeakAggregation,
			}),
			userId,
		}),
	);
	const summaryQuery = useQuery(
		exposureQueryOptions({
			exposure,
			query: buildExposureQuery(exposure, "month", monthDate, {
				field: exposure === "dust" ? dustField : undefined,
				usePeakAggregation,
				granularity,
			}),
			userId,
		}),
	);
	const isLoading = dayQuery.isLoading || summaryQuery.isLoading;
	const dayData = dayQuery.data?.data ?? [];
	const summaryData = summaryQuery.data?.data ?? [];
	const hasReportedRef = useRef(false);
	const onPageReadyRef = useRef(onPageReady);
	onPageReadyRef.current = onPageReady;

	useEffect(() => {
		if (isLoading || hasReportedRef.current) return;
		hasReportedRef.current = true;
		onPageReadyRef.current({
			key: PAGE_KEYS.single(exposure),
			spec: {
				kind: "calendar",
				exposure,
				month: monthDate,
				days: getCalendarDays(monthDate, mapExposureDataToTimeBucketStatuses(dayData, exposure, false)),
				summary: calculateSummaryCounts(summaryData, {
					exposure,
					peakAggregation: usePeakAggregation,
					granularity,
				}),
			},
		});
	}, [isLoading, exposure, monthDate, dayData, summaryData, usePeakAggregation, granularity]);

	return null;
}
