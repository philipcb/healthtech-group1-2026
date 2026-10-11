import { MIN_GROUP_SIZE } from "@/features/medical-team/medical-team-groups.ts";
import type {
	GroupSummaryRequest,
	GroupSummaryResponse,
	GroupTrendPoint,
	GroupTrendRequest,
	GroupTrendResponse,
} from "@/features/medical-team/medical-team-queries.ts";
import {
	getGroupAverageDailyPoints,
	getGroupAverageDailyPointsTrend,
	type VibrationSession,
} from "@/features/medical-team/vibration-aggregation.ts";
import { MEDICAL_TEAM_DEMO_SITE } from "@/features/user/user-utils.ts";
import { today } from "@/lib/date.ts";
import { type Exposure, exposureUnitByExposure } from "@/lib/exposures.ts";
import {
	eachDayOfInterval,
	endOfMonth,
	endOfYear,
	formatDate,
	isWeekend,
	max,
	min,
	startOfMonth,
	startOfYear,
} from "date-fns";
import seedrandom from "seedrandom";

/*
 * Synthetic stand-in for the aggregate API. The overview and a group's details are served from the same data, so they
 * always agree:
 * - dust and noise: one group value per working day, generated from the group's baseline
 * - vibration: tool sessions per person and day, aggregated with the rules in `vibration-aggregation.ts`
 */

/**
 * Exposures with a single group value per bucket, based on fields the aggregate database already stores. Vibration is
 * aggregated from each person's daily points instead, see `vibration-aggregation.ts`, which the aggregate database
 * doesn't store yet.
 */
type ComparableExposure = Extract<Exposure, "dust" | "noise">;

type MockGroup = {
	id: string;
	site: string;
	hall: string;
	occupation: string;
	/** Only used to decide whether the backend would return the group, never sent to the frontend */
	peopleCount: number;
	/** The level the group's daily averages vary around */
	baseline: Record<ComparableExposure, number>;
	/**
	 * Typical daily vibration points for a person in the group. Synthetic, not derived from any vibration data, and only
	 * used to generate sessions that show the planned aggregation.
	 */
	syntheticVibrationPointsPerDay: number;
};

const mockGroups: Array<MockGroup> = [
	{
		id: "hall-1-welder",
		site: MEDICAL_TEAM_DEMO_SITE,
		hall: "M-hallen",
		occupation: "Welder",
		peopleCount: 12,
		baseline: { dust: 142, noise: 82 },
		syntheticVibrationPointsPerDay: 46,
	},
	{
		id: "hall-1-technician",
		site: MEDICAL_TEAM_DEMO_SITE,
		hall: "M-hallen",
		occupation: "Technician",
		peopleCount: 8,
		baseline: { dust: 96, noise: 76 },
		syntheticVibrationPointsPerDay: 31,
	},
	{
		id: "hall-1-electrician",
		site: MEDICAL_TEAM_DEMO_SITE,
		hall: "M-hallen",
		occupation: "Electrician",
		peopleCount: 6,
		baseline: { dust: 74, noise: 73 },
		syntheticVibrationPointsPerDay: 18,
	},
	{
		id: "hall-2-welder",
		site: MEDICAL_TEAM_DEMO_SITE,
		hall: "Hall 2",
		occupation: "Welder",
		peopleCount: 10,
		baseline: { dust: 171, noise: 84 },
		syntheticVibrationPointsPerDay: 52,
	},
	{
		id: "hall-2-technician",
		site: MEDICAL_TEAM_DEMO_SITE,
		hall: "Hall 2",
		occupation: "Technician",
		peopleCount: 9,
		baseline: { dust: 117, noise: 78 },
		syntheticVibrationPointsPerDay: 27,
	},
	{
		id: "hall-2-fitter",
		site: MEDICAL_TEAM_DEMO_SITE,
		hall: "Hall 2",
		occupation: "Fitter",
		peopleCount: 7,
		baseline: { dust: 133, noise: 81 },
		syntheticVibrationPointsPerDay: 39,
	},
	{
		// Too small to be shown, so the backend leaves it out of every response
		id: "hall-2-electrician",
		site: MEDICAL_TEAM_DEMO_SITE,
		hall: "Hall 2",
		occupation: "Electrician",
		peopleCount: 3,
		baseline: { dust: 88, noise: 75 },
		syntheticVibrationPointsPerDay: 22,
	},
];

/** The synthetic data starts here, so earlier periods show the empty state */
const DATA_START = new Date(2025, 0, 1);

/** Share of working days where too few people contributed, which the backend would hide */
const SUPPRESSED_DAY_SHARE = 0.06;
/** Most people are on summer holiday in July, so most days that month are hidden */
const SUPPRESSED_JULY_DAY_SHARE = 0.7;

/** How much a day's average varies around the group's baseline */
const dailyVariation: Record<ComparableExposure, (baseline: number, random: number) => number> = {
	// Decibels are logarithmic, so the variation is a few dB rather than a percentage
	noise: (baseline, random) => baseline + (random - 0.5) * 6,
	dust: (baseline, random) => baseline * (1 + (random - 0.5) * 0.5),
};

/** How often a person's sensor is registered on a working day, which differs between people */
const MIN_VIBRATION_REGISTRATION_SHARE = 0.35;
const MAX_VIBRATION_REGISTRATION_SHARE = 0.9;
/** Fewer people work in July, so fewer register vibration */
const JULY_VIBRATION_REGISTRATION_FACTOR = 0.3;
/** Share of registered days where the person used no vibrating tools, giving an explicit 0 */
const ZERO_VIBRATION_DAY_SHARE = 0.08;
const MAX_VIBRATION_SESSIONS_PER_DAY = 5;

type SyntheticDay = { date: Date; value: number; isSuppressed: boolean };

type PeriodRequest = Pick<GroupTrendRequest, "exposure" | "period" | "year" | "month">;

export async function fetchMockGroupSummaries(request: GroupSummaryRequest): Promise<GroupSummaryResponse> {
	// Uses the same days and average as the trend, so a group's value matches its details
	const getAverage = (group: MockGroup, exposure: ComparableExposure) =>
		getPeriodAverage(getSyntheticDays(group, { ...request, exposure }), exposure);
	const getVibrationAverage = (group: MockGroup) =>
		roundVibration(getGroupAverageDailyPoints(getMockVibrationSessions(group.id, request), MIN_GROUP_SIZE));

	const groups = mockGroups
		.filter((group) => group.site === request.site && group.peopleCount >= MIN_GROUP_SIZE)
		.map((group) => ({
			groupId: group.id,
			hall: group.hall,
			occupation: group.occupation,
			averages: {
				dust: getAverage(group, "dust"),
				noise: getAverage(group, "noise"),
				vibration: getVibrationAverage(group),
			},
		}));

	return { units: exposureUnitByExposure, groups };
}

export async function fetchMockGroupTrend(request: GroupTrendRequest): Promise<GroupTrendResponse> {
	const group = mockGroups.find((candidate) => candidate.id === request.groupId);

	if (!group) {
		return { status: "unavailable", reason: "noSuchGroup" };
	}

	if (group.peopleCount < MIN_GROUP_SIZE) {
		return { status: "unavailable", reason: "tooFewPeople" };
	}

	const isYear = request.period === "year";
	const exposure = request.exposure;

	if (exposure === "vibration") {
		const sessions = getMockVibrationSessions(group.id, request);
		const trend = getGroupAverageDailyPointsTrend(sessions, isYear ? "month" : "day", MIN_GROUP_SIZE);

		return {
			status: "ok",
			group: { hall: group.hall, occupation: group.occupation },
			unit: exposureUnitByExposure.vibration,
			average: roundVibration(getGroupAverageDailyPoints(sessions, MIN_GROUP_SIZE)),
			granularity: isYear ? "month" : "day",
			points: trend.map((point) => ({ time: point.time, value: roundVibration(point.value) })),
		};
	}

	const days = getSyntheticDays(group, { ...request, exposure });

	return {
		status: "ok",
		group: { hall: group.hall, occupation: group.occupation },
		unit: exposureUnitByExposure[exposure],
		average: getPeriodAverage(days, exposure),
		granularity: isYear ? "month" : "day",
		points: isYear ? toMonthlyPoints(days, exposure) : toDailyPoints(days, exposure),
	};
}

/**
 * Synthetic tool sessions for every person in a group, on the working days in the period. People differ in level and
 * in how often they're registered, a day can have several sessions, and some registered days are worth 0 points.
 */
function getMockVibrationSessions(groupId: string, period: PeriodSelectionRequest): Array<VibrationSession> {
	const group = mockGroups.find((candidate) => candidate.id === groupId);

	if (!group) {
		return [];
	}

	const people = Array.from({ length: group.peopleCount }, (_, index) => {
		const random = seedrandom(`${group.id}:person:${index}`);
		const registrationShare =
			MIN_VIBRATION_REGISTRATION_SHARE +
			random() * (MAX_VIBRATION_REGISTRATION_SHARE - MIN_VIBRATION_REGISTRATION_SHARE);

		return { id: `${group.id}:${index}`, level: 0.4 + random() * 1.2, registrationShare };
	});

	return getWorkingDays(period).flatMap((day) => {
		const date = formatDate(day, "yyyy-MM-dd");

		return people.flatMap((person): Array<VibrationSession> => {
			// Seeded per person and day, so a day has the same sessions in every view
			const random = seedrandom(`${person.id}:vibration:${date}`);
			const julyFactor = day.getMonth() === 6 ? JULY_VIBRATION_REGISTRATION_FACTOR : 1;

			// Not registered that day: missing data, not 0
			if (random() >= person.registrationShare * julyFactor) {
				return [];
			}

			if (random() < ZERO_VIBRATION_DAY_SHARE) {
				return [{ personId: person.id, date, points: 0 }];
			}

			const dayPoints = group.syntheticVibrationPointsPerDay * person.level * (0.6 + random() * 0.8);
			const sessionCount = 1 + Math.floor(random() * MAX_VIBRATION_SESSIONS_PER_DAY);
			const weights = Array.from({ length: sessionCount }, () => random());
			const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

			return weights.map((weight) => ({ personId: person.id, date, points: (dayPoints * weight) / totalWeight }));
		});
	});
}

type PeriodSelectionRequest = Pick<GroupTrendRequest, "period" | "year" | "month">;

/** The working days in the period that have data, from the data start up to today */
function getWorkingDays({ period, year, month }: PeriodSelectionRequest): Array<Date> {
	const periodStart = period === "year" ? startOfYear(new Date(year, 0, 1)) : new Date(year, month, 1);
	const periodEnd = period === "year" ? endOfYear(periodStart) : endOfMonth(periodStart);
	const from = max([periodStart, DATA_START]);
	const to = min([periodEnd, today()]);

	if (from > to) {
		return [];
	}

	return eachDayOfInterval({ start: from, end: to }).filter((date) => !isWeekend(date));
}

/** One value per working day with data in the requested period, from the data start up to today */
function getSyntheticDays(
	group: MockGroup,
	{ exposure, ...period }: PeriodRequest & { exposure: ComparableExposure },
): Array<SyntheticDay> {
	return getWorkingDays(period).map((date) => {
		// Seeded per day, so a day has the same value in every view
		const random = seedrandom(`${group.id}:${exposure}:${formatDate(date, "yyyy-MM-dd")}`);
		const value = dailyVariation[exposure](group.baseline[exposure], random());
		const suppressedShare = date.getMonth() === 6 ? SUPPRESSED_JULY_DAY_SHARE : SUPPRESSED_DAY_SHARE;

		return { date, value, isSuppressed: random() < suppressedShare };
	});
}

/**
 * The period average includes hidden days, since a whole period has enough people contributing, even when a single
 * day doesn't. This is an assumption the backend would have to make explicit.
 */
function getPeriodAverage(days: Array<SyntheticDay>, exposure: ComparableExposure): number | null {
	if (days.length === 0) {
		return null;
	}

	return round(days.reduce((sum, day) => sum + day.value, 0) / days.length, exposure);
}

function toDailyPoints(days: Array<SyntheticDay>, exposure: ComparableExposure): Array<GroupTrendPoint> {
	return days.map((day) => ({
		time: formatDate(day.date, "yyyy-MM-dd"),
		value: day.isSuppressed ? null : round(day.value, exposure),
	}));
}

function toMonthlyPoints(days: Array<SyntheticDay>, exposure: ComparableExposure): Array<GroupTrendPoint> {
	const daysByMonth = new Map<string, Array<SyntheticDay>>();

	for (const day of days) {
		const key = formatDate(startOfMonth(day.date), "yyyy-MM-dd");
		daysByMonth.set(key, [...(daysByMonth.get(key) ?? []), day]);
	}

	return Array.from(daysByMonth, ([time, monthDays]) => ({ time, value: getPeriodAverage(monthDays, exposure) }));
}

function round(value: number, exposure: ComparableExposure) {
	return Number(value.toFixed(exposure === "noise" ? 1 : 0));
}

function roundVibration(value: number | null) {
	return value === null ? null : Number(value.toFixed(1));
}
