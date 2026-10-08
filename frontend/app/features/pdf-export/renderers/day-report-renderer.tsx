import type { CollectedPage, PdfExportProgress } from "@/features/pdf-export/pdf-page-spec.ts";
import { SingleDayChartRenderer } from "@/features/pdf-export/renderers/single-day-renderer.tsx";
import { useBatchQueue } from "@/features/pdf-export/renderers/use-batch-queue.ts";
import type { PdfDayReport } from "@/hooks/pdf-day-report.ts";
import type { Exposure } from "@/lib/exposures.ts";
import type { TZDate } from "@date-fns/tz";
import { useCallback, useRef } from "react";

/**
 * How many day reports are mounted at once. Separate from PERIOD_BATCH_SIZE
 * because each report renders several chart SVGs, where a month is now
 * pure data.
 */
const DAY_REPORT_BATCH_SIZE = 3;

export type DayReportJob = {
	key: string;
	exposure: Exposure;
	date: TZDate;
};

/**
 * One red day's report, using the same SVG path as a standalone day export.
 */
function DayReportPage({
	job,
	userId,
	onDone,
}: {
	job: DayReportJob;
	userId: string;
	onDone: (report: PdfDayReport) => void;
}) {
	const hasReportedRef = useRef(false);
	const onDoneRef = useRef(onDone);
	onDoneRef.current = onDone;

	const handlePageReady = useCallback(({ spec }: CollectedPage) => {
		if (spec.kind !== "day-report" || hasReportedRef.current) return;
		hasReportedRef.current = true;
		onDoneRef.current(spec);
	}, []);

	return (
		<SingleDayChartRenderer exposure={job.exposure} date={job.date} userId={userId} onPageReady={handlePageReady} />
	);
}

/**
 * Renders every day report DAY_REPORT_BATCH_SIZE at a time, then hands them all
 * back in job order (not finishing order) once the last one is in.
 */
export function DayReportBatchRenderer({
	jobs,
	userId,
	onAllDone,
	onProgress,
}: {
	jobs: Array<DayReportJob>;
	userId: string;
	onAllDone: (reports: Array<PdfDayReport>) => void;
	onProgress?: (progress: PdfExportProgress) => void;
}) {
	const { activeJobs, markDone } = useBatchQueue(jobs, DAY_REPORT_BATCH_SIZE);
	const reportsRef = useRef(new Map<string, PdfDayReport>());
	const hasFinishedRef = useRef(false);
	const onAllDoneRef = useRef(onAllDone);
	onAllDoneRef.current = onAllDone;
	const onProgressRef = useRef(onProgress);
	onProgressRef.current = onProgress;

	const handleDone = useCallback(
		(key: string, report: PdfDayReport) => {
			const countBefore = reportsRef.current.size;
			reportsRef.current.set(key, report);
			markDone(key);
			if (reportsRef.current.size > countBefore) {
				onProgressRef.current?.({ step: "dayReports", done: reportsRef.current.size, total: jobs.length });
			}

			if (hasFinishedRef.current || reportsRef.current.size < jobs.length) return;
			hasFinishedRef.current = true;

			onAllDoneRef.current(
				jobs.flatMap((job) => {
					const done = reportsRef.current.get(job.key);
					return done ? [done] : [];
				}),
			);
		},
		[jobs, markDone],
	);

	return (
		<>
			{activeJobs.map((job) => (
				<DayReportPage
					key={job.key}
					job={job}
					userId={userId}
					onDone={(report) => handleDone(job.key, report)}
				/>
			))}
		</>
	);
}
