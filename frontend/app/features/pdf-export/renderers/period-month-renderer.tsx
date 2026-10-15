import type { CollectedPage } from "@/features/pdf-export/pdf-page-spec.ts";
import { PAGE_KEYS } from "@/features/pdf-export/renderers/page-keys.ts";
import { useBatchQueue } from "@/features/pdf-export/renderers/use-batch-queue.ts";
import { exposureQueryOptions } from "@/lib/api.ts";
import { type Aggregation, Aggregations } from "@/lib/dto/exposure.ts";
import type { Note } from "@/lib/dto/note.ts";
import { buildExposureQuery, getSummaryGranularity } from "@/lib/exposure-query-utils.ts";
import { defaultDustField, type Exposure, parseAsDustField } from "@/lib/exposures.ts";
import { getCalendarDays } from "@/lib/pdf/calendar-days.ts";
import { getPeriodMonths, type PdfPeriod } from "@/lib/pdf/period.ts";
import { getRedDays } from "@/lib/pdf/red-days.ts";
import { calculateSummaryCounts, mapExposureDataToTimeBucketStatuses } from "@/lib/time-bucket-utils.ts";
import type { TZDate } from "@date-fns/tz";
import { useQuery } from "@tanstack/react-query";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useEffect, useRef } from "react";

/**
 * How many month-pages are mounted at once during a period export - across ALL
 * exposure types combined (see PeriodBatchRenderer), not per type. A month is
 * unmounted as soon as it's done, so this is the most that's ever mounted at
 * once regardless of how many months or exposure types the export covers.
 * Without this, "Overview" would mount all 12 months x 3 types = 36 at once.
 */
const PERIOD_BATCH_SIZE = 6;

/** Collects calendar and red-day page data for one exposure and month. */
function MonthGridPage({
	exposure,
	monthDate,
	monthIndex,
	userId,
	notes,
	onPageReady,
	onDone,
}: {
	exposure: Exposure;
	monthDate: TZDate;
	monthIndex: number;
	userId: string;
	notes: Array<Note>;
	onPageReady: (page: CollectedPage) => void;
	onDone: () => void;
}) {
	const granularity = getSummaryGranularity(exposure);
	const [dustField] = useQueryState("dustField", parseAsDustField.withDefault(defaultDustField));
	const parseAsAggregation = parseAsStringLiteral(Aggregations);
	const [aggregation] = useQueryState<Aggregation>("aggregation", parseAsAggregation.withDefault("average"));
	const usePeakAggregation = aggregation === "peak";

	// Day granularity: one bucket per day, drives the calendar colours and tells us
	// which days are red.
	const gridQuery = useQuery(
		exposureQueryOptions({
			exposure,
			query: buildExposureQuery(exposure, "month", monthDate, {
				field: exposure === "dust" ? dustField : undefined,
				usePeakAggregation,
			}),
			userId,
		}),
	);

	// Summary granularity: the SAME query ExposureSummary makes on this page, so it is
	// served from the React Query cache. Gives per-day zone minutes and averages.
	const minuteQuery = useQuery(
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

	const isLoading = gridQuery.isLoading || minuteQuery.isLoading;

	const onPageReadyRef = useRef(onPageReady);
	onPageReadyRef.current = onPageReady;
	const onDoneRef = useRef(onDone);
	onDoneRef.current = onDone;
	const hasStartedRef = useRef(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: dayData/minuteData/notes read synchronously once, guarded by hasStartedRef — see MonthGridPage's original comment for the same reasoning.
	useEffect(() => {
		if (isLoading || hasStartedRef.current) return;
		hasStartedRef.current = true;

		const dayData = gridQuery.data?.data ?? [];
		const minuteData = minuteQuery.data?.data ?? [];

		onPageReadyRef.current({
			key: PAGE_KEYS.calendar(exposure, monthIndex),
			spec: {
				kind: "calendar",
				exposure,
				month: monthDate,
				days: getCalendarDays(monthDate, mapExposureDataToTimeBucketStatuses(dayData, exposure, false)),
				summary: calculateSummaryCounts(minuteData, {
					exposure,
					peakAggregation: usePeakAggregation,
					granularity,
				}),
			},
		});

		onPageReadyRef.current({
			key: PAGE_KEYS.redDays(exposure, monthIndex),
			spec: {
				kind: "red-days",
				exposure,
				month: monthDate,
				rows: getRedDays({ exposure, dayData, minuteData, notes, granularity }),
			},
		});

		onDoneRef.current();
	}, [isLoading, exposure, monthIndex, monthDate]);

	return null;
}

type MonthJob = {
	key: string;
	exposure: Exposure;
	monthIndex: number;
	monthDate: TZDate;
};

/**
 * Period export: schedules every (exposure, month) pair - across ALL exposure
 * types together, not per type - as one shared queue, processing
 * PERIOD_BATCH_SIZE of them at a time (see the constant's comment for why, and
 * useBatchQueue for how the window advances).
 */
export function PeriodBatchRenderer({
	exposures,
	period,
	userId,
	notes,
	onPageReady,
}: {
	exposures: Array<Exposure>;
	period: PdfPeriod;
	userId: string;
	notes: Array<Note>;
	onPageReady: (page: CollectedPage) => void;
}) {
	const months = getPeriodMonths(period);

	const jobs: Array<MonthJob> = exposures.flatMap((exposure) =>
		months.map((monthDate, monthIndex) => ({
			key: `${exposure}-${monthIndex}`,
			exposure,
			monthIndex,
			monthDate,
		})),
	);

	const { activeJobs, markDone } = useBatchQueue(jobs, PERIOD_BATCH_SIZE);

	return (
		<>
			{activeJobs.map((job) => (
				<MonthGridPage
					key={job.key}
					exposure={job.exposure}
					monthDate={job.monthDate}
					monthIndex={job.monthIndex}
					userId={userId}
					notes={notes}
					onPageReady={onPageReady}
					onDone={() => markDone(job.key)}
				/>
			))}
		</>
	);
}
