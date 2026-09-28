import { TIMEZONE } from "@/i18n/locale.ts";
import { toTZDate } from "@/lib/date.ts";
import type { TimeBucketStatus } from "@/lib/time-bucket-types.ts";
import {
	addDays,
	eachDayOfInterval,
	eachHourOfInterval,
	isSameWeek,
	setHours,
	startOfDay,
	startOfHour,
	startOfWeek,
} from "date-fns";

interface UseWeekTimeGridParams {
	displayedDate: Date;
	dayStartHour: number;
	dayEndHour: number;
	data: Array<TimeBucketStatus>;
}

export function useWeekTimeGrid({ displayedDate, dayStartHour, dayEndHour, data }: UseWeekTimeGridParams) {
	const daysInWeek = eachDayOfInterval({
		start: startOfWeek(displayedDate),
		end: addDays(startOfWeek(displayedDate), 6),
	}).map(toTZDate);

	const timeSlotSegments = daysInWeek.map((day) => {
		const start = setHours(startOfDay(day), dayStartHour);
		const end = setHours(startOfDay(day), dayEndHour);
		return {
			date: day,
			timeSlots: eachHourOfInterval({ start, end }).map(toTZDate),
		};
	});

	const visibleTimeBuckets = data.filter((timeBucket) => {
		const hour = timeBucket.time.getHours();
		return (
			isSameWeek(daysInWeek[0], timeBucket.time, { in: TIMEZONE }) && hour >= dayStartHour && hour <= dayEndHour
		);
	});

	const timeBucketsByHour = groupTimeBucketsByHour(visibleTimeBuckets);

	return { timeSlotSegments, timeBucketsByHour };
}

function groupTimeBucketsByHour(timeBuckets: Array<TimeBucketStatus>) {
	const lookup = new Map<number, TimeBucketStatus>();
	for (const timeBucket of timeBuckets) {
		lookup.set(startOfHour(timeBucket.time).getTime(), timeBucket);
	}
	return lookup;
}
