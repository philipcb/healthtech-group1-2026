import type { GroupLevel } from "@/features/medical-team/medical-team-groups.ts";
import {
	fetchMockGroupSummaries,
	fetchMockGroupTrend,
	fetchMockHallSummaries,
} from "@/features/medical-team/medical-team-mock-data.ts";
import type { MedicalPeriod } from "@/features/medical-team/medical-team-period.ts";
import type { DustField, Exposure, ExposureUnit } from "@/lib/exposures.ts";
import { queryOptions } from "@tanstack/react-query";
import { minutesToMilliseconds } from "date-fns";

/*
 * Contracts for the medical team's aggregated data, shaped like future API responses. Both are served by the same
 * synthetic source, so a group's average is the same in the overview and in its details.
 *
 * What each exposure's value is, and where it comes from in the aggregate database (branch
 * `24-epic-create-an-anonymous-database-duplicate`):
 * - dust: the group's average PM1 TWA, `DustAverage.AveragePm1Twa`. A group's details can ask for PM2.5 or PM10 instead
 *   (`AveragePm25Twa`, `AveragePm10Twa`).
 * - noise: the group's average LAeq, stored in `NoiseAverage.AverageLcpk`, because the two noise columns are filled in
 *   swapped. It's an arithmetic average of decibels, which underestimates the energy average.
 * - vibration: points, aggregated the way the backend is planned to (see `vibration-aggregation.ts`): each person's
 *   points summed per day, averaged per person over the period, then averaged over the people. Requires new data: the
 *   aggregate database only stores average points per tool session (`VibrationAverage.AverageExposure`), which can't
 *   be turned into daily sums. Never converted to m/s² or A(8), since how the equipment calculates points isn't
 *   documented.
 *
 * Every value is an unweighted average of each person's average, never a value for a single person. The aggregate
 * tables only hold hourly rows per `Sample`, so daily, monthly and period averages, hiding values with too few people,
 * and access control for the medical team all need a new endpoint and new aggregates.
 */

type PeriodRequest = {
	exposure: Exposure;
	period: MedicalPeriod;
	year: number;
	/** Zero-based month, only used for the month period */
	month: number;
};

/**
 * The groups at a site, one per hall and occupation. These match `Sample` rows with both `LocationQualifier` and
 * `JobQualifier` set. Whole halls and the whole site are never included next to them, because subtracting overlapping
 * groups from each other can reveal the values of the people that only belong to one of them.
 */
export type GroupSummaryRequest = Omit<PeriodRequest, "exposure"> & { site: string };

export type GroupSummary = {
	/** The aggregate database's `Sample.Id` */
	groupId: string;
	/**
	 * Requires new data: the aggregate database only stores the hall's id from the operational database, not its name
	 */
	hall: string;
	occupation: string;
	/**
	 * The group's average for the whole period, per exposure. `null` when there are no measurements in the period, or
	 * when the backend hid the value because too few people contributed.
	 */
	averages: Record<Exposure, number | null>;
};

export type GroupSummaryResponse = {
	units: Record<Exposure, ExposureUnit>;
	/** Groups with too few people are left out by the backend, not hidden by the frontend */
	groups: Array<GroupSummary>;
};

/**
 * Demo only, served by synthetic mock data: whole halls aren't approved for real data, and the rule on
 * `GroupSummaryRequest` still applies to it. A whole hall would match the `Sample` row with `LocationQualifier` set and
 * `JobQualifier` left out, which covers every operator registered in the hall, people without an occupation included.
 *
 * Every person weighs the same, the same rule as a group's value, so it's calculated from each person's data, never by
 * combining the groups' averages, since the groups differ in size and don't cover everyone in the hall. The mock only
 * shows how the view looks: it doesn't protect against subtracting the groups from the hall, which a real endpoint
 * has to enforce on the server.
 */
export type HallSummary = {
	/** The aggregate database's `Sample.Id`, so a hall's details use the same route as a group's */
	groupId: string;
	hall: string;
	/** Same meaning as `GroupSummary.averages` */
	averages: Record<Exposure, number | null>;
};

/** Demo only, see `HallSummary` */
export type HallSummaryResponse = {
	units: Record<Exposure, ExposureUnit>;
	/** Halls with too few people are left out by the backend, like groups */
	halls: Array<HallSummary>;
};

export type GroupTrendRequest = PeriodRequest & {
	groupId: string;
	/** The dust fraction to show, only used for dust. Defaults to PM1 TWA, the fraction the overview shows. */
	dustField?: DustField;
};

/**
 * One point per day, for both a month and a year, so short variations aren't averaged away. Kept as a field, so other
 * buckets can be added later without changing the response's shape.
 */
export type GroupTrendGranularity = "day";

export type GroupTrendPoint = {
	/** Local date of the day, as `yyyy-MM-dd` */
	time: string;
	/**
	 * The group's average for the bucket. `null` means the backend hid the value because too few people contributed
	 * measurements in the bucket. Buckets without any measurements are left out.
	 *
	 * Requires a new aggregate: the aggregate database doesn't store how many people contributed to each hour.
	 */
	value: number | null;
};

/** Who a trend covers: a hall and occupation, or a whole hall, which is demo only, see `HallSummary` */
export type TrendGroup =
	| ({ level: Extract<GroupLevel, "occupation"> } & Pick<GroupSummary, "hall" | "occupation">)
	| { level: Extract<GroupLevel, "hall">; hall: string };

export type GroupTrendResponse =
	| {
			status: "ok";
			group: TrendGroup;
			unit: ExposureUnit;
			/** Same value as the group's `GroupSummary.averages` for the same exposure and period */
			average: number | null;
			granularity: GroupTrendGranularity;
			points: Array<GroupTrendPoint>;
	  }
	| {
			/** The backend refuses to return the group, instead of the frontend hiding it */
			status: "unavailable";
			reason: "noSuchGroup" | "tooFewPeople";
	  };

export function groupSummariesQueryOptions(request: GroupSummaryRequest) {
	return queryOptions({
		queryKey: ["medicalTeam", "groupSummaries", request],
		// TODO: Fetch from the aggregate API once it exists
		queryFn: () => fetchMockGroupSummaries(request),
		staleTime: minutesToMilliseconds(10),
	});
}

/** Demo only, see `HallSummary`. Not to be connected to real data before the backend protects it. */
export function hallSummariesQueryOptions(request: GroupSummaryRequest) {
	return queryOptions({
		queryKey: ["medicalTeam", "hallSummaries", request],
		queryFn: () => fetchMockHallSummaries(request),
		staleTime: minutesToMilliseconds(10),
	});
}

export function groupTrendQueryOptions(request: GroupTrendRequest) {
	return queryOptions({
		queryKey: ["medicalTeam", "groupTrend", request],
		// TODO: Fetch from the aggregate API once it exists. The backend must also check that the group belongs to the
		// medical team's site.
		queryFn: () => fetchMockGroupTrend(request),
		staleTime: minutesToMilliseconds(10),
	});
}
