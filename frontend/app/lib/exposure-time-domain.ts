import { TIMEZONE_NAME } from "@/i18n/locale.ts";
import { TZDate } from "@date-fns/tz";
import { DEFAULT_MAX_HOUR_DOMAIN, DEFAULT_MIN_HOUR_DOMAIN, type HourDomainDto } from "./dto/hour-domain.ts";
import type { View } from "./views.ts";

const MAX_CHART_HOUR = 23;
const MIN_CHART_HOUR = 0;

export const clampHour = (hour: number) => Math.max(Math.min(hour, MAX_CHART_HOUR), MIN_CHART_HOUR);

export function getHourDomain(
	hourDomain: HourDomainDto | undefined,
	dates: Array<TZDate> | undefined,
	viewForPadding: View,
): {
	minHour: number;
	maxHour: number;
} {
	// Should we have no data, then we use the local defaults
	if (!(dates?.length && hourDomain)) {
		const minHour = clampHour(hourDomain?.minHourUtc ?? DEFAULT_MIN_HOUR_DOMAIN);
		const maxHour = clampHour(hourDomain?.maxHourUtc ?? DEFAULT_MAX_HOUR_DOMAIN);

		return { minHour, maxHour };
	}

	// Should we have data, then the hourDomain is defined and is UTC
	const { minHourUtc, maxHourUtc } = hourDomain;

	const minHours = dates.map((d) => convertUtcHourToLocalHour(minHourUtc, d));
	const maxHours = dates.map((d) => convertUtcHourToLocalHour(maxHourUtc, d));

	// maxHour in day views are non-inclusive, meaning if the last data point is 14:30,
	// maxHour needs to be at least 15 to include that data point in the chart. While week and month views are inclusive.
	// We add an additional hour of padding to ensure that the data doesn't look cut off
	const minHourPadding = 1;
	const maxHourPadding = viewForPadding === "day" ? 2 : 1;

	const rawMin = Math.min(...minHours);
	const rawMax = Math.max(...maxHours);

	const minHour = clampHour(rawMin - minHourPadding);
	const maxHour = clampHour(rawMax + maxHourPadding);
	return { minHour, maxHour };
}

function convertUtcHourToLocalHour(utcHour: number, date: TZDate): number {
	const localDate = new TZDate(date, TIMEZONE_NAME);
	localDate.setUTCHours(utcHour);
	return localDate.getHours();
}
