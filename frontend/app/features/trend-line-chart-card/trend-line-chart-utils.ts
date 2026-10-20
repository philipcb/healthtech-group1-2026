import type { ExposureDataDto } from "@/lib/api/generated/models/index.ts";
import { startOfWeek } from "date-fns";

/**
 * Returns one datapoint for each week, with the maximum value of that week
 */
export function toWeeklyMax(data: Array<ExposureDataDto>): Array<ExposureDataDto> {
	const maxByWeek = new Map<string, ExposureDataDto>();

	for (const item of data) {
		const weekStart = startOfWeek(item.time, { weekStartsOn: 1 });
		const key = weekStart.toISOString();

		const existing = maxByWeek.get(key);

		if (!existing || item.value > existing.value) {
			maxByWeek.set(key, {
				...item,
				time: weekStart,
			});
		}
	}

	return Array.from(maxByWeek.values()).sort((a, b) => a.time.getTime() - b.time.getTime());
}
