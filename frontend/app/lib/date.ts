import { TIMEZONE, TIMEZONE_NAME } from "@/i18n/locale.ts";
import { TZDate } from "@date-fns/tz";
import { addDays, addMonths, addWeeks, formatDate, isExists, startOfDay, subDays, subMonths, subWeeks } from "date-fns";
import { createParser } from "nuqs";
import { z } from "zod";
import type { View } from "./views.ts";

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_ONLY_FORMAT = "yyyy-MM-dd";

/**
 * Parses "yyyy-MM-dd" strings into TZDate objects.
 */
const parseDateOnly = (value: string): TZDate | null => {
	const match = DATE_ONLY_PATTERN.exec(value);

	if (!match) {
		return null;
	}

	const [, year, month, day] = match;
	const parsedYear = Number(year);
	const parsedMonth = Number(month) - 1;
	const parsedDay = Number(day);

	if (!isExists(parsedYear, parsedMonth, parsedDay)) {
		return null;
	}

	return new TZDate(parsedYear, parsedMonth, parsedDay, TIMEZONE_NAME);
};

export const toTZDate = (value: Date | number | string): TZDate => {
	if (value instanceof Date) {
		return TZDate.tz(TIMEZONE_NAME, value);
	}

	if (typeof value === "number") {
		return TZDate.tz(TIMEZONE_NAME, value);
	}

	return TZDate.tz(TIMEZONE_NAME, value);
};

export const now = (): TZDate => TZDate.tz(TIMEZONE_NAME);

export const today = (): TZDate => startOfDay(now());

export const parseAsTZDate = createParser<TZDate>({
	parse: parseDateOnly,
	serialize: (date) => formatDate(date, DATE_ONLY_FORMAT, { in: TIMEZONE }),
	eq: (a, b) => a.getTime() === b.getTime(),
});

export const tzDateSchema = z.coerce.date().transform((value) => toTZDate(value));

export const getPrevDay = (selectedDay: TZDate, view: View): TZDate => {
	let prevDay: TZDate;
	if (view === "day") {
		prevDay = subDays(selectedDay, 1);
	} else if (view === "week") {
		prevDay = subWeeks(selectedDay, 1);
	} else {
		prevDay = subMonths(selectedDay, 1);
	}

	return prevDay;
};

export const getNextDay = (selectedDay: TZDate, view: View): TZDate => {
	let nextDay: TZDate;
	if (view === "day") {
		nextDay = addDays(selectedDay, 1);
	} else if (view === "week") {
		nextDay = addWeeks(selectedDay, 1);
	} else {
		nextDay = addMonths(selectedDay, 1);
	}

	return nextDay;
};
