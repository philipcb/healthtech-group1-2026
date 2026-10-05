import { TIMEZONE } from "@/i18n/locale.ts";
import type { TZDate } from "@date-fns/tz";
import { endOfYear, startOfYear } from "date-fns";

export function getYearRange(date: TZDate): { startTime: TZDate; endTime: TZDate } {
	return {
		startTime: startOfYear(date, { in: TIMEZONE }),
		endTime: endOfYear(date, { in: TIMEZONE }),
	};
}
