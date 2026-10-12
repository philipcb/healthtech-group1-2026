import { MIN_GROUP_SIZE } from "@/features/medical-team/medical-team-groups.ts";
import type {
	GroupSummaryRequest,
	GroupSummaryResponse,
	GroupTrendPoint,
	GroupTrendRequest,
	GroupTrendResponse,
	HallSummary,
	HallSummaryResponse,
} from "@/features/medical-team/medical-team-queries.ts";
import {
	getGroupAverageDailyPoints,
	getGroupAverageDailyPointsTrend,
	type VibrationSession,
} from "@/features/medical-team/vibration-aggregation.ts";
import { MEDICAL_TEAM_DEMO_SITE } from "@/features/user/user-utils.ts";
import { today } from "@/lib/date.ts";
import { type DustField, defaultDustField, type Exposure, exposureUnitByExposure } from "@/lib/exposures.ts";
import {
	differenceInCalendarDays,
	eachDayOfInterval,
	endOfMonth,
	endOfYear,
	formatDate,
	isWeekend,
	max,
	min,
	startOfYear,
} from "date-fns";
import seedrandom from "seedrandom";

/*
 * Synthetic stand-in for the aggregate API. The overview and a group's details are served from the same data, so they
 * always agree:
 * - dust and noise: one group value per working day, generated from the group's baseline with synthetic variation that
 *   develops over a few weeks, see `getSyntheticDays`. Dust is PM1, and a group's
 *   details can also show PM2.5 and PM10 from synthetic demo baselines, see `syntheticDustBaselines`.
 * - vibration: tool sessions per person and day, aggregated with the rules in `vibration-aggregation.ts`
 * - whole halls: a demo only, calculated from the people in all of the hall's groups, see `mockHalls`
 *
 * A trend has one point per working day, for both a month and a year. Weekends have no measurements, so they're left
 * out rather than filled in.
 */

/**
 * Exposures with a single group value per bucket, based on fields the aggregate database already stores. Vibration is
 * aggregated from each person's daily points instead, see `vibration-aggregation.ts`, which the aggregate database
 * doesn't store yet.
 */
type ComparableExposure = Extract<Exposure, "dust" | "noise">;

/** Dust fractions besides PM1, which only a group's details show */
type SyntheticDustField = Exclude<DustField, "pm1_twa">;

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
	/**
	 * Synthetic demo baselines for PM2.5 and PM10, not measurements. Chosen by hand so the fractions can be compared
	 * visually, and set so they normally follow PM1 ≤ PM2.5 ≤ PM10, which isn't guaranteed for real measurements. PM1
	 * stays `baseline.dust`.
	 */
	syntheticDustBaselines: Record<SyntheticDustField, number>;
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
		syntheticDustBaselines: { pm25_twa: 158, pm10_twa: 205 },
	},
	{
		id: "hall-1-technician",
		site: MEDICAL_TEAM_DEMO_SITE,
		hall: "M-hallen",
		occupation: "Technician",
		peopleCount: 8,
		baseline: { dust: 96, noise: 76 },
		syntheticVibrationPointsPerDay: 31,
		syntheticDustBaselines: { pm25_twa: 112, pm10_twa: 168 },
	},
	{
		id: "hall-1-electrician",
		site: MEDICAL_TEAM_DEMO_SITE,
		hall: "M-hallen",
		occupation: "Electrician",
		peopleCount: 6,
		baseline: { dust: 74, noise: 73 },
		syntheticVibrationPointsPerDay: 18,
		syntheticDustBaselines: { pm25_twa: 86, pm10_twa: 131 },
	},
	{
		id: "hall-2-welder",
		site: MEDICAL_TEAM_DEMO_SITE,
		hall: "Hall 2",
		occupation: "Welder",
		peopleCount: 10,
		baseline: { dust: 171, noise: 84 },
		syntheticVibrationPointsPerDay: 52,
		syntheticDustBaselines: { pm25_twa: 189, pm10_twa: 244 },
	},
	{
		id: "hall-2-technician",
		site: MEDICAL_TEAM_DEMO_SITE,
		hall: "Hall 2",
		occupation: "Technician",
		peopleCount: 9,
		baseline: { dust: 117, noise: 78 },
		syntheticVibrationPointsPerDay: 27,
		syntheticDustBaselines: { pm25_twa: 136, pm10_twa: 197 },
	},
	{
		id: "hall-2-fitter",
		site: MEDICAL_TEAM_DEMO_SITE,
		hall: "Hall 2",
		occupation: "Fitter",
		peopleCount: 7,
		baseline: { dust: 133, noise: 81 },
		syntheticVibrationPointsPerDay: 39,
		syntheticDustBaselines: { pm25_twa: 152, pm10_twa: 226 },
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
		syntheticDustBaselines: { pm25_twa: 101, pm10_twa: 149 },
	},
];

type MockHall = {
	id: string;
	site: string;
	hall: string;
};

/**
 * Whole halls, demo only, see `HallSummary`. A hall's people are the people in all of its groups, the groups too small
 * to be returned included. Real halls would also include operators without an occupation, who aren't in any group.
 */
const mockHalls: Array<MockHall> = [
	{ id: "hall-1", site: MEDICAL_TEAM_DEMO_SITE, hall: "M-hallen" },
	{ id: "hall-2", site: MEDICAL_TEAM_DEMO_SITE, hall: "Hall 2" },
];

/** The synthetic data starts here, so earlier periods show the empty state */
const DATA_START = new Date(2025, 0, 1);

/** Share of working days where too few people contributed, which the backend would hide */
const SUPPRESSED_DAY_SHARE = 0.06;
/** Most people are on summer holiday in July, so most days that month are hidden */
const SUPPRESSED_JULY_DAY_SHARE = 0.7;

/**
 * Synthetic variation that develops over time, not a model of how real exposure varies. A day's draw follows two slow
 * waves, plus a smaller share of the day's own random draw, so the trend is easier to follow than with independent
 * days. Lengths in calendar days, chosen so the waves don't line up with months.
 */
const WAVE_PERIOD_DAYS = [13, 29];
/** How far the waves move a day's draw, in the draw's 0-1 units */
const WAVE_AMPLITUDE = 0.35;
/** How much of a day's own random draw is kept, so single days still stand out */
const DAILY_DRAW_SHARE = 0.4;

/** How much a day's average varies around the group's baseline, linear in the day's draw */
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

/** Demo only, see `HallSummary` */
export async function fetchMockHallSummaries(request: GroupSummaryRequest): Promise<HallSummaryResponse> {
	const halls = mockHalls
		.filter((hall) => hall.site === request.site)
		.map((hall): HallSummary => {
			// Uses the same days and average as the hall's trend, so the hall's value matches its details
			const getAverage = (exposure: ComparableExposure) =>
				getPeriodAverage(getHallDays(hall, { ...request, exposure }), exposure);

			return {
				groupId: hall.id,
				hall: hall.hall,
				averages: {
					dust: getAverage("dust"),
					noise: getAverage("noise"),
					vibration: roundVibration(
						getGroupAverageDailyPoints(getHallVibrationSessions(hall, request), MIN_GROUP_SIZE),
					),
				},
			};
		});

	return { units: exposureUnitByExposure, halls };
}

/** A group's trend, or a whole hall's, which is demo only, see `HallSummary` */
export async function fetchMockGroupTrend(request: GroupTrendRequest): Promise<GroupTrendResponse> {
	const hall = mockHalls.find((candidate) => candidate.id === request.groupId);

	if (hall) {
		return getMockHallTrend(hall, request);
	}

	const group = mockGroups.find((candidate) => candidate.id === request.groupId);

	if (!group) {
		return { status: "unavailable", reason: "noSuchGroup" };
	}

	if (group.peopleCount < MIN_GROUP_SIZE) {
		return { status: "unavailable", reason: "tooFewPeople" };
	}

	const exposure = request.exposure;

	if (exposure === "vibration") {
		const sessions = getMockVibrationSessions(group.id, request);
		const trend = getGroupAverageDailyPointsTrend(sessions, "day", MIN_GROUP_SIZE);

		return {
			status: "ok",
			group: { level: "occupation", hall: group.hall, occupation: group.occupation },
			unit: exposureUnitByExposure.vibration,
			average: roundVibration(getGroupAverageDailyPoints(sessions, MIN_GROUP_SIZE)),
			granularity: "day",
			points: trend.map((point) => ({ time: point.time, value: roundVibration(point.value) })),
		};
	}

	const days = getGroupDays(group, { ...request, exposure }, request.dustField ?? defaultDustField);

	return {
		status: "ok",
		group: { level: "occupation", hall: group.hall, occupation: group.occupation },
		unit: exposureUnitByExposure[exposure],
		average: getPeriodAverage(days, exposure),
		granularity: "day",
		points: toDailyPoints(days, exposure),
	};
}

function getMockHallTrend(hall: MockHall, request: GroupTrendRequest): GroupTrendResponse {
	const exposure = request.exposure;

	if (exposure === "vibration") {
		const sessions = getHallVibrationSessions(hall, request);
		const trend = getGroupAverageDailyPointsTrend(sessions, "day", MIN_GROUP_SIZE);

		return {
			status: "ok",
			group: { level: "hall", hall: hall.hall },
			unit: exposureUnitByExposure.vibration,
			average: roundVibration(getGroupAverageDailyPoints(sessions, MIN_GROUP_SIZE)),
			granularity: "day",
			points: trend.map((point) => ({ time: point.time, value: roundVibration(point.value) })),
		};
	}

	const days = getHallDays(hall, { ...request, exposure }, request.dustField ?? defaultDustField);

	return {
		status: "ok",
		group: { level: "hall", hall: hall.hall },
		unit: exposureUnitByExposure[exposure],
		average: getPeriodAverage(days, exposure),
		granularity: "day",
		points: toDailyPoints(days, exposure),
	};
}

/** Every group in the hall, the groups too small to be returned included */
function getHallGroups(hall: MockHall) {
	return mockGroups.filter((group) => group.site === hall.site && group.hall === hall.hall);
}

/**
 * The hall's value per working day, where every person in the hall weighs the same, never the average of its groups'
 * averages. The synthetic data has one value per group and day rather than per person, so this assumes every person
 * contributes on every working day. A real backend has to average each person's own values instead.
 */
function getHallDays(
	hall: MockHall,
	request: PeriodRequest & { exposure: ComparableExposure },
	dustField: DustField = defaultDustField,
): Array<SyntheticDay> {
	const groups = getHallGroups(hall).map((group) => ({
		peopleCount: group.peopleCount,
		days: getGroupDays(group, request, dustField),
	}));
	const peopleCount = sumOf(groups.map((group) => group.peopleCount));

	// Every group has a value on every working day in the period, so their days line up
	return (groups[0]?.days ?? []).map((day, index) => ({
		date: day.date,
		value: sumOf(groups.map((group) => group.peopleCount * group.days[index].value)) / peopleCount,
		// The mock only shows how the view looks, so none of a hall's days are hidden, see `HallSummary`
		isSuppressed: false,
	}));
}

/** Every person in the hall, so the hall follows the same rules as a group, see `vibration-aggregation.ts` */
function getHallVibrationSessions(hall: MockHall, period: PeriodSelectionRequest): Array<VibrationSession> {
	return getHallGroups(hall).flatMap((group) => getMockVibrationSessions(group.id, period));
}

/** A group's days for the dust fraction, PM1 unless another fraction is given */
function getGroupDays(
	group: MockGroup,
	request: PeriodRequest & { exposure: ComparableExposure },
	dustField: DustField,
): Array<SyntheticDay> {
	// PM2.5 and PM10 are synthetic demo series with their own baselines, generated the same way as PM1
	return request.exposure === "dust" && dustField !== "pm1_twa"
		? getSyntheticDays(group, request, group.syntheticDustBaselines[dustField])
		: getSyntheticDays(group, request);
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

/**
 * One value per working day with data in the requested period, from the data start up to today. A dust fraction's
 * baseline can be given instead of PM1's, and keeps the same seed, so every fraction varies and is hidden on the same days.
 *
 * The waves and the day's own draw are shifted so a month's draws keep the average of its independent daily draws.
 * Since a day's value is linear in its draw, every month and year keeps the same average as with independent days.
 */
function getSyntheticDays(
	group: MockGroup,
	{ exposure, ...period }: PeriodRequest & { exposure: ComparableExposure },
	baseline = group.baseline[exposure],
): Array<SyntheticDay> {
	const seed = `${group.id}:${exposure}`;
	const monthAverages = new Map<string, { draw: number; wave: number }>();

	return getWorkingDays(period).map((date) => {
		// Seeded per day, so a day has the same value in every view
		const random = seedrandom(`${seed}:${formatDate(date, "yyyy-MM-dd")}`);
		const draw = random();
		const suppressedShare = date.getMonth() === 6 ? SUPPRESSED_JULY_DAY_SHARE : SUPPRESSED_DAY_SHARE;
		const isSuppressed = random() < suppressedShare;

		const monthKey = formatDate(date, "yyyy-MM");
		const month = monthAverages.get(monthKey) ?? getMonthAverages(seed, date);
		monthAverages.set(monthKey, month);
		const coherentDraw =
			month.draw + WAVE_AMPLITUDE * (getWave(seed, date) - month.wave) + DAILY_DRAW_SHARE * (draw - month.draw);

		return { date, value: dailyVariation[exposure](baseline, coherentDraw), isSuppressed };
	});
}

/**
 * The average daily draw and wave over the working days in the date's month that have data, the same days as the
 * month's average. Until the month is over, its days shift slightly as days are added, the way its average does.
 */
function getMonthAverages(seed: string, date: Date) {
	const days = getWorkingDays({ period: "month", year: date.getFullYear(), month: date.getMonth() });
	const average = (values: Array<number>) => values.reduce((sum, value) => sum + value, 0) / values.length;

	return {
		draw: average(days.map((day) => seedrandom(`${seed}:${formatDate(day, "yyyy-MM-dd")}`)())),
		wave: average(days.map((day) => getWave(seed, day))),
	};
}

/** Between -1 and 1, with phases seeded per group and exposure, so groups don't rise and fall together */
function getWave(seed: string, date: Date) {
	const random = seedrandom(`${seed}:wave`);
	const day = differenceInCalendarDays(date, DATA_START);

	return (
		WAVE_PERIOD_DAYS.reduce(
			(sum, period) => sum + Math.sin((2 * Math.PI * day) / period + random() * 2 * Math.PI),
			0,
		) / WAVE_PERIOD_DAYS.length
	);
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

function round(value: number, exposure: ComparableExposure) {
	return Number(value.toFixed(exposure === "noise" ? 1 : 0));
}

function roundVibration(value: number | null) {
	return value === null ? null : Number(value.toFixed(1));
}

function sumOf(values: Array<number>) {
	return values.reduce((total, value) => total + value, 0);
}
