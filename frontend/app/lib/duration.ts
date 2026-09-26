import { formatDuration, hoursToMinutes, type Locale, minutesToHours } from "date-fns";

const HOURS_IN_DAY = 24;

/**
 * Formats a minute count as a localized duration, e.g. "6 hours 40 minutes".
 * Used by the exposure summary cards and by the red-day tables in the PDF export.
 */
export function formatMinutesAsDuration(totalMinutes: number, locale: Locale) {
	if (totalMinutes === 0) {
		return formatDuration({ minutes: 0 }, { locale, format: ["minutes"], zero: true });
	}

	const totalHours = minutesToHours(totalMinutes);
	const days = Math.floor(totalHours / HOURS_IN_DAY);
	const hours = totalHours - days * HOURS_IN_DAY;
	const minutes = totalMinutes - hoursToMinutes(totalHours);

	const format: Array<"days" | "hours" | "minutes"> = [];

	if (days > 0) {
		format.push("days");
	}

	if (hours > 0) {
		format.push("hours");
	}

	if (minutes > 0) {
		format.push("minutes");
	}

	return formatDuration({ days, hours, minutes: minutes }, { locale, format }).replace("en", "1");
}

/** Formats a minute count as localized hours and remaining minutes. */
export function formatMinutesAsHoursAndMinutes(totalMinutes: number, locale: Locale) {
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes - hoursToMinutes(hours);
	const format: Array<"hours" | "minutes"> = [];

	if (hours > 0) format.push("hours");
	if (minutes > 0 || format.length === 0) format.push("minutes");

	return formatDuration({ hours, minutes }, { locale, format, zero: true }).replace("en", "1");
}
