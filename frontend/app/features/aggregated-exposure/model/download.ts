import type { ComparisonSeries } from "@/features/aggregated-exposure/components/comparison-trend-chart.tsx";
import type { SeriesSlot } from "@/features/aggregated-exposure/model/series.ts";
import { toTrendDay } from "@/features/aggregated-exposure/model/trend-chart.ts";
import type { TranslateFn } from "@/i18n/config.ts";
import type { DustField, Exposure, ExposureUnit } from "@/lib/exposures.ts";
import { exposureFilters } from "./groups";

// The downloaded files' decimals. Dust gets two in µg/m³, since its values are often below 1 µg/m³, and four in mg/m³.
export const DOWNLOAD_FRACTION_DIGITS: Record<ExposureUnit, number> = { mg: 4, ug: 2, db: 1, points: 1 };

export function getDownloadExposureName(exposure: Exposure, dustField: DustField, t: TranslateFn) {
    const exposureLabel = t(($) => $.exposures[exposure]);
    if (exposure !== "dust") {
        return exposureLabel;
    }
    return `${exposureLabel} ${t(($) => $.exposures.dustFields[dustField])} ${dustField.split("_")[1].toUpperCase()}`
}

/** One day of a comparison, with each group's value by its slot */
export type ComparisonDownloadRow = { day: Date; values: Map<SeriesSlot, number | null> };

/** One row per day and one column per group, like the chart. A group without a value that day gets an empty cell. */
export function toComparisonDownloadRows(series: Array<ComparisonSeries>): Array<ComparisonDownloadRow> {
        const rowsByDay = new Map<number, ComparisonDownloadRow>();
        for (const { slot, points } of series) {
                for (const point of points) {
                        const day = toTrendDay(point.time);
                        const row = rowsByDay.get(day.getTime()) ?? { day, values: new Map() };
                        row.values.set(slot, point.value);
                        rowsByDay.set(day.getTime(), row);
                }
        }

        return [...rowsByDay.values()].toSorted((a, b) => a.day.getTime() - b.day.getTime());
}