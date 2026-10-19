import type { AggregationFunction, ExposureType, Field, TimeGranularity } from "@/lib/api/generated/models/index.ts";
import { parseAsStringLiteral } from "nuqs";

/** The backend's exposure types, in the order the app shows them */
export const exposures = ["dust", "noise", "vibration"] as const satisfies ReadonlyArray<ExposureType>;
export type Exposure = ExposureType;
export const parseAsExposure = parseAsStringLiteral(exposures);

export const exposureUnits = ["mg", "ug", "points", "db"] as const;
export type ExposureUnit = (typeof exposureUnits)[number];
export const parseAsExposureUnit = parseAsStringLiteral(exposureUnits);

/** Default unit per exposure type, matching the live exposure cards. */
export const exposureUnitByExposure: Record<Exposure, ExposureUnit> = {
	dust: "ug",
	noise: "db",
	vibration: "points",
};

/** What is measured for an exposure type, like PM1 TWA for dust */
export type ExposureTypeField = Field;

export const dustFields = ["pm1_twa", "pm25_twa", "pm10_twa"] as const satisfies ReadonlyArray<ExposureTypeField>;
export type DustField = (typeof dustFields)[number];
export const defaultDustField: DustField = "pm1_twa";
export const parseAsDustField = parseAsStringLiteral(dustFields);

export type Aggregation = "average" | "peak";
export const Aggregations: Array<Aggregation> = ["average", "peak"];

export function aggregationFor(exposure: Exposure, usePeakAggregation: boolean): AggregationFunction {
	switch (exposure) {
		case "dust":
			return "avg";
		case "noise":
			return usePeakAggregation ? "max" : "avg";
		case "vibration":
			return "sum";
	}
}

/** The granularity of the data the exposure summary counts minutes in each danger level from */
export function getSummaryGranularity(exposure: Exposure | null): TimeGranularity {
	return exposure === "vibration" ? "hour" : "minute";
}

export function isExposure(input: string): input is Exposure {
	// biome-ignore lint/suspicious/noExplicitAny: Array#includes requires argument to be a exposure, not a string
	return exposures.includes(input as any);
}

export function toExposure(input: string): Exposure | null {
	const string = input.toLowerCase().replaceAll(/[^a-z]/g, "");

	if (isExposure(string)) {
		return string;
	}

	return null;
}
