import { useCallback, useState } from "react";

/**
 * Runs a list of keyed jobs `batchSize` at a time. `activeJobs` is always the
 * earliest jobs not yet marked done - tracked by key, NOT by a count of how many
 * have finished. Jobs finish out of order, so a count would let a later job
 * finishing first slide the window past an earlier, still-running one and
 * unmount it before it ever reported.
 */
export function useBatchQueue<T extends { key: string }>(jobs: Array<T>, batchSize: number) {
	const [completedKeys, setCompletedKeys] = useState<Set<string>>(() => new Set());
	const activeJobs = jobs.filter((job) => !completedKeys.has(job.key)).slice(0, batchSize);

	const markDone = useCallback((key: string) => {
		setCompletedKeys((prev) => {
			if (prev.has(key)) return prev;
			const next = new Set(prev);
			next.add(key);
			return next;
		});
	}, []);

	return { activeJobs, markDone };
}
