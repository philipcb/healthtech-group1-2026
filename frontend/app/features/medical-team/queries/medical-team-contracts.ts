import type { GroupLevel } from "@/features/medical-team/medical-team-groups.ts";
import { type MedicalPeriod, medicalPeriods } from "@/features/medical-team/medical-team-period.ts";
import { type DustField, type Exposure, exposures, exposureUnitByExposure, exposureUnits } from "@/lib/exposures.ts";
import { z } from "zod";

/*
 * Contracts for the medical team's aggregated data: Zod schemas for the responses and plain types for the requests,
 * like `lib/dto`. Every response comes from synthetic mock data for now.
 *
 * Parsing only checks the shape. Hiding small groups, protecting against subtracting overlapping groups and access
 * control have to be enforced by the backend.
 *
 * Where each value would come from in the aggregate database (branch `24-epic-create-an-anonymous-database-duplicate`):
 * - dust: average PM1 TWA, `DustAverage.AveragePm1Twa`, or PM2.5/PM10 in a group's details.
 * - noise: average LAeq, stored in `NoiseAverage.AverageLcpk` since the noise columns are swapped. An arithmetic
 *   average of decibels, which underestimates the energy average.
 * - vibration: each person's points summed per day, averaged per person, then averaged over the people. Needs new
 *   data, since only average points per tool session are stored. Never converted to m/s² or A(8), since how the
 *   equipment calculates points isn't documented. The mock's values are synthetic group values.
 *
 * Every value is an unweighted average of each person's average, never one person's value. Daily and period
 * aggregates, hiding small groups and access control all need a new endpoint.
 */

type PeriodRequest = {
	exposure: Exposure;
	period: MedicalPeriod;
	year: number;
	/** Zero-based month, only used for the month period */
	month: number;
};

/**
 * One group per hall and occupation: `Sample` rows with both `LocationQualifier` and `JobQualifier` set. Whole halls
 * and the site are never returned next to them, since subtracting overlapping groups can reveal individuals.
 */
export type GroupSummaryRequest = Omit<PeriodRequest, "exposure"> & { site: string };

export type GroupTrendRequest = PeriodRequest & {
	groupId: string;
	/** Only used for dust. Defaults to PM1 TWA, like the overview. */
	dustField?: DustField;
};

export type ExposureKpiRequest = GroupSummaryRequest & {
	level: GroupLevel;
	/** The dust fraction dust's KPI is calculated for, with that fraction's thresholds. Defaults to PM1 TWA. */
	dustField?: DustField;
};

/** Shared by groups and halls */
export const ExposureUnitsSchema = z.object({
	dust: z.enum(exposureUnits),
	noise: z.enum(exposureUnits),
	vibration: z.enum(exposureUnits),
} satisfies Record<Exposure, unknown>);

/**
 * The period's average per exposure, shared by groups and halls. `null` when there are no measurements, or when the
 * backend hid the value because too few people contributed, which isn't told apart yet.
 */
export const ExposureAveragesSchema = z.object({
	dust: z.number().nullable(),
	noise: z.number().nullable(),
	vibration: z.number().nullable(),
} satisfies Record<Exposure, unknown>);

export const GroupSummarySchema = z.object({
	/** The aggregate database's `Sample.Id` */
	groupId: z.string(),
	/** Needs new data: the aggregate database only stores the hall's id, not its name */
	hall: z.string(),
	occupation: z.string(),
	averages: ExposureAveragesSchema,
});

export type GroupSummary = z.infer<typeof GroupSummarySchema>;

export const GroupSummaryResponseSchema = z.object({
	units: ExposureUnitsSchema,
	/** Groups with too few people are left out by the backend, not hidden by the frontend */
	groups: GroupSummarySchema.array(),
});

export type GroupSummaryResponse = z.infer<typeof GroupSummaryResponseSchema>;

/**
 * Demo only, from mock data: whole halls aren't approved for real data, and the rule on `GroupSummaryRequest` still
 * applies. Would match the `Sample` row with only `LocationQualifier` set, so it covers everyone in the hall, people
 * without an occupation included. Every person weighs the same, so it's calculated from each person's data, never from
 * the groups' averages. Protecting against subtracting the groups from the hall has to be enforced by the backend.
 * Kept apart from `GroupSummarySchema`, since a hall isn't a group without an occupation.
 */
export const HallSummarySchema = z.object({
	/** `Sample.Id`, so a hall's details use the same route as a group's */
	groupId: z.string(),
	hall: z.string(),
	averages: ExposureAveragesSchema,
});

export type HallSummary = z.infer<typeof HallSummarySchema>;

/** Demo only, see `HallSummarySchema` */
export const HallSummaryResponseSchema = z.object({
	units: ExposureUnitsSchema,
	/** Halls with too few people are left out by the backend, like groups */
	halls: HallSummarySchema.array(),
});

export type HallSummaryResponse = z.infer<typeof HallSummaryResponseSchema>;

/** One point per day for both a month and a year, so short variations aren't averaged away */
export const GroupTrendGranularitySchema = z.literal("day");

export type GroupTrendGranularity = z.infer<typeof GroupTrendGranularitySchema>;

export const GroupTrendPointSchema = z.object({
	/** Local date */
	time: z.iso.date(),
	/**
	 * `null` when the backend hid the value because too few people contributed. Days without measurements are left out.
	 * Needs a new aggregate, since the number of contributors per hour isn't stored.
	 */
	value: z.number().nullable(),
});

export type GroupTrendPoint = z.infer<typeof GroupTrendPointSchema>;

/** A hall and occupation, or a whole hall, which is demo only */
export const TrendGroupSchema = z.discriminatedUnion("level", [
	z.object({ level: z.literal("occupation" satisfies GroupLevel), hall: z.string(), occupation: z.string() }),
	z.object({ level: z.literal("hall" satisfies GroupLevel), hall: z.string() }),
]);

export type TrendGroup = z.infer<typeof TrendGroupSchema>;

export const GroupTrendResponseSchema = z.discriminatedUnion("status", [
	z.object({
		status: z.literal("ok"),
		group: TrendGroupSchema,
		unit: z.enum(exposureUnits),
		/** Same value as `GroupSummary.averages` for the exposure and period */
		average: z.number().nullable(),
		granularity: GroupTrendGranularitySchema,
		points: GroupTrendPointSchema.array(),
	}),
	z.object({
		/** Refused by the backend, not hidden by the frontend */
		status: z.literal("unavailable"),
		reason: z.enum(["noSuchGroup", "tooFewPeople"]),
	}),
]);

export type GroupTrendResponse = z.infer<typeof GroupTrendResponseSchema>;

/*
 * Exposure KPIs: how much was above the action and limit values in a period. `MEDICAL_TEAM_KPIS.md` describes what each
 * KPI means and what isn't confirmed. Parsing only checks that the values are possible, it's no privacy control.
 */

/**
 * Each exposure's KPI unit, which also says what was calculated. Percentages are 0-100.
 * - dust: share of workdays with the person's 8-hour TWA for the requested fraction above that fraction's threshold.
 *   Neither the sensor's TWA values nor TWA thresholds are documented yet, so the backend should return it as
 *   `unavailable` until they are. The mock shows demo values meanwhile.
 * - noise: average measured minutes per workday with a sound level above the threshold.
 * - vibration: share of workdays with daily points above the threshold. Points are a daily dose, never a duration.
 */
export const kpiUnitByExposure = {
	dust: "percentOfWorkdays",
	noise: "minutesPerWorkday",
	vibration: "percentOfWorkdays",
} as const satisfies Record<Exposure, string>;

export const ExposureKpiUnitSchema = z.enum(kpiUnitByExposure);
export type ExposureKpiUnit = z.infer<typeof ExposureKpiUnitSchema>;

const MINUTES_PER_DAY = 24 * 60;

const maxValueByUnit: Record<ExposureKpiUnit, number> = {
	minutesPerWorkday: MINUTES_PER_DAY,
	percentOfWorkdays: 100,
};

/** The values the backend compared with, in the exposure's unit */
export const ExposureKpiThresholdsSchema = z
	.object({
		action: z.number().positive(),
		limit: z.number().positive(),
		unit: z.enum(exposureUnits),
	})
	.refine((thresholds) => thresholds.action < thresholds.limit, {
		message: "The action value has to be below the limit value",
		path: ["limit"],
	});

export type ExposureKpiThresholds = z.infer<typeof ExposureKpiThresholdsSchema>;

export const ExposureKpiResultSchema = z.discriminatedUnion("status", [
	z
		.object({
			status: z.literal("ok"),
			unit: ExposureKpiUnitSchema,
			aboveAction: z.number().nonnegative(),
			aboveLimit: z.number().nonnegative(),
		})
		.refine((result) => result.aboveAction <= maxValueByUnit[result.unit], {
			message: "The value is larger than its unit allows",
			path: ["aboveAction"],
		})
		// Everything above the limit value is also above the action value, so it's never larger
		.refine((result) => result.aboveLimit <= result.aboveAction, {
			message: "The result above the limit value can't be larger than the result above the action value",
			path: ["aboveLimit"],
		}),
	/** No valid measurements in the period */
	z.object({ status: z.literal("noData") }),
	/** Hidden by the backend: too few people contributed, or it could reveal individuals */
	z.object({ status: z.literal("suppressed") }),
	/** Can't be calculated on a professionally sound basis yet */
	z.object({ status: z.literal("unavailable") }),
]);

export type ExposureKpiResult = z.infer<typeof ExposureKpiResultSchema>;

/** Same as requested. `month` is zero-based and only used for a month. */
export const ExposureKpiPeriodSchema = z.object({
	period: z.enum(medicalPeriods),
	year: z.int(),
	month: z.int().min(0).max(11),
});

export type ExposureKpiPeriod = z.infer<typeof ExposureKpiPeriodSchema>;

export const ExposureKpiResponseSchema = z
	.object({
		period: ExposureKpiPeriodSchema,
		/**
		 * The same for every group, so they're only sent once. `null` when there's no documented threshold for what the
		 * KPI is calculated from, and every group's KPI for that exposure is then `unavailable`.
		 */
		thresholds: z.object({
			dust: ExposureKpiThresholdsSchema.nullable(),
			noise: ExposureKpiThresholdsSchema.nullable(),
			vibration: ExposureKpiThresholdsSchema.nullable(),
		} satisfies Record<Exposure, unknown>),
		/** The requested level's groups or halls, by the same `groupId` as their summaries */
		groups: z
			.object({
				groupId: z.string().min(1),
				kpis: z.object({
					dust: ExposureKpiResultSchema,
					noise: ExposureKpiResultSchema,
					vibration: ExposureKpiResultSchema,
				} satisfies Record<Exposure, unknown>),
			})
			.array(),
	})
	// Checks that depend on which exposure a value belongs to, or compare groups
	.superRefine((response, context) => {
		for (const exposure of exposures) {
			const thresholds = response.thresholds[exposure];

			if (thresholds !== null && thresholds.unit !== exposureUnitByExposure[exposure]) {
				context.addIssue({
					code: "custom",
					message: `Expected the unit ${exposureUnitByExposure[exposure]}`,
					path: ["thresholds", exposure, "unit"],
				});
			}
		}

		response.groups.forEach((group, index) => {
			for (const exposure of exposures) {
				const result = group.kpis[exposure];

				if (result.status === "ok" && result.unit !== kpiUnitByExposure[exposure]) {
					context.addIssue({
						code: "custom",
						message: `Expected the unit ${kpiUnitByExposure[exposure]}`,
						path: ["groups", index, "kpis", exposure, "unit"],
					});
				}

				// A result can only be shown with the thresholds it was compared with
				if (result.status === "ok" && response.thresholds[exposure] === null) {
					context.addIssue({
						code: "custom",
						message: "A result needs its exposure's thresholds",
						path: ["groups", index, "kpis", exposure],
					});
				}
			}
		});

		if (new Set(response.groups.map((group) => group.groupId)).size !== response.groups.length) {
			context.addIssue({ code: "custom", message: "Every group can only be included once", path: ["groups"] });
		}
	});

export type ExposureKpiResponse = z.infer<typeof ExposureKpiResponseSchema>;
