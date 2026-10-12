import { MIN_GROUP_SIZE } from "@/features/medical-team/medical-team-groups.ts";
import {
	type ExposureKpiRequest,
	type ExposureKpiResponse,
	type ExposureKpiResult,
	type GroupSummaryRequest,
	type GroupSummaryResponse,
	type GroupTrendPoint,
	type GroupTrendRequest,
	type GroupTrendResponse,
	type HallSummary,
	type HallSummaryResponse,
	kpiUnitByExposure,
} from "@/features/medical-team/queries/medical-team-contracts.ts";
import {
	getGroupAverageDailyPoints,
	getGroupAverageDailyPointsTrend,
	type VibrationSession,
} from "@/features/medical-team/queries/vibration-aggregation.ts";
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
 * Synthetic stand-in for the aggregate API. The overview and the details use the same data, so they always agree:
 * - dust and noise: one value per group and working day, varying around the group's baseline, see `getSyntheticDays`.
 *   PM2.5 and PM10 use synthetic demo baselines.
 * - vibration: tool sessions per person and day, aggregated with `vibration-aggregation.ts`
 * - whole halls: demo only, calculated from the people in all of the hall's groups
 * - KPIs: made-up examples, not calculated from anything above
 *
 * Weekends have no measurements, so they're left out rather than filled in.
 */

/** Exposures with one group value per day. Vibration is aggregated from each person's daily points instead. */
type ComparableExposure = Extract<Exposure, "dust" | "noise">;

/** Only shown in a group's details */
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
	/** Typical daily points per person. Made up, only used to generate sessions for the planned aggregation. */
	syntheticVibrationPointsPerDay: number;
	/** Made-up PM2.5 and PM10 baselines, set so PM1 ≤ PM2.5 ≤ PM10, which real measurements don't guarantee */
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
 * Demo only. A hall's people are everyone in its groups, the small groups included. Real halls would also include
 * operators without an occupation.
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
 * Made-up variation that develops over weeks, not a model of real exposure: two slow waves plus some of the day's own
 * draw. Lengths in calendar days, chosen so the waves don't line up with months.
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

/** A group's trend, or a whole hall's, which is demo only */
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
 * The hall's daily value, where every person weighs the same, never the average of the groups' averages. Assumes
 * everyone contributes every working day, since the synthetic data has one value per group and day, not per person.
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
		// No privacy rules in the demo, so none of a hall's days are hidden
		isSuppressed: false,
	}));
}

/** Every person in the hall, so the hall follows the same rules as a group */
function getHallVibrationSessions(hall: MockHall, period: PeriodSelectionRequest): Array<VibrationSession> {
	return getHallGroups(hall).flatMap((group) => getMockVibrationSessions(group.id, period));
}

/**
 * Configurable thresholds for the KPI examples. Dust's are the project's PM1 STEL values, which have no confirmed
 * source.
 */
const syntheticKpiThresholds: Record<Exposure, { action: number; limit: number }> = {
	dust: { action: 7.5, limit: 15 },
	noise: { action: 80, limit: 85 },
	vibration: { action: 100, limit: 400 },
};

/**
 * Made-up ranges for the KPI examples. `limitShare` is the result above the limit value as a share of the one above the
 * action value.
 */
const syntheticKpiRanges: Record<Exposure, { aboveAction: [number, number]; limitShare: [number, number] }> = {
	dust: { aboveAction: [4, 45], limitShare: [0.1, 0.45] },
	noise: { aboveAction: [10, 120], limitShare: [0.15, 0.5] },
	vibration: { aboveAction: [2, 40], limitShare: [0, 0.2] },
};

/** Synthetic examples of results the backend hides because too few people contributed */
const syntheticSuppressedKpis = new Set(["hall-1-electrician:vibration"]);

/** Made-up KPI examples drawn from `syntheticKpiRanges`, not calculated from measurements or hourly aggregates */
export async function fetchMockExposureKpis(request: ExposureKpiRequest): Promise<ExposureKpiResponse> {
	const groupIds =
		request.level === "hall"
			? mockHalls.filter((hall) => hall.site === request.site).map((hall) => hall.id)
			: mockGroups
					.filter((group) => group.site === request.site && group.peopleCount >= MIN_GROUP_SIZE)
					.map((group) => group.id);
	const workingDayCount = getWorkingDays(request).length;
	const getThresholds = (exposure: Exposure) => ({
		...syntheticKpiThresholds[exposure],
		unit: exposureUnitByExposure[exposure],
	});

	return {
		period: { period: request.period, year: request.year, month: request.month },
		thresholds: {
			dust: getThresholds("dust"),
			noise: getThresholds("noise"),
			vibration: getThresholds("vibration"),
		},
		groups: groupIds.map((groupId) => ({
			groupId,
			kpis: {
				dust: getSyntheticKpiResult(groupId, "dust", request, workingDayCount),
				noise: getSyntheticKpiResult(groupId, "noise", request, workingDayCount),
				vibration: getSyntheticKpiResult(groupId, "vibration", request, workingDayCount),
			},
		})),
	};
}

function getSyntheticKpiResult(
	groupId: string,
	exposure: Exposure,
	request: ExposureKpiRequest,
	workingDayCount: number,
): ExposureKpiResult {
	if (workingDayCount === 0) {
		return { status: "noData" };
	}

	// Most people are on summer holiday in July, so a group's July is hidden, while a hall still has enough people
	const isJulyForGroup = request.level === "occupation" && request.period === "month" && request.month === 6;

	if (isJulyForGroup || syntheticSuppressedKpis.has(`${groupId}:${exposure}`)) {
		return { status: "suppressed" };
	}

	// Seeded per group, exposure and period, so a KPI is the same every time it's shown
	const random = seedrandom(`${groupId}:kpi:${exposure}:${request.period}:${request.year}:${request.month}`);
	const draw = ([low, high]: [number, number]) => low + random() * (high - low);
	const { aboveAction, limitShare } = syntheticKpiRanges[exposure];
	const resultAboveAction = draw(aboveAction);
	const resultAboveLimit = resultAboveAction * draw(limitShare);

	return {
		status: "ok",
		unit: kpiUnitByExposure[exposure],
		aboveAction: Math.round(resultAboveAction),
		aboveLimit: Math.round(resultAboveLimit),
	};
}

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
 * Made-up tool sessions per person and working day. People differ in level and in how often they're registered, and
 * some registered days are worth 0 points.
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
 * One value per working day with data. Every dust fraction keeps the same seed, so they vary and are hidden on the same
 * days. The draws are shifted so every month and year keeps the average of independent daily draws.
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

/** The average draw and wave over the month's working days with data, which shift slightly until the month is over */
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
 * Includes hidden days, since a whole period has enough people contributing even when a single day doesn't. An
 * assumption the backend would have to make explicit.
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
