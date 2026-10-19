import type { TimeGranularity } from "@/lib/api/generated/models/index.ts";
import { parseAsStringLiteral } from "nuqs";

export const views = ["day", "week", "month"] as const;
export type View = (typeof views)[number];
export const parseAsView = parseAsStringLiteral(views);

/** The granularity exposure data is fetched with in each view */
export const granularityByView: Record<View, TimeGranularity> = {
	day: "minute",
	week: "hour",
	month: "day",
};

/** Like `granularityByView`, except that the overview shows hourly data in the day view */
export const overviewGranularityByView: Record<View, TimeGranularity> = {
	day: "hour",
	week: "hour",
	month: "day",
};
