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
	type HallWorkforceResponse,
	kpiUnitByExposure,
} from "@/features/aggregated-exposure/api/contracts.ts";
import { MIN_GROUP_SIZE } from "@/features/aggregated-exposure/model/groups.ts";
import { OCCUPATIONAL_HEALTH_SERVICE_DEMO_SITE } from "@/features/user/user-utils.ts";
import { today } from "@/lib/date.ts";
import { type DustField, defaultDustField, type Exposure, exposureUnitByExposure } from "@/lib/exposures.ts";
import { getThreshold } from "@/lib/thresholds.ts";
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
 * - dust, noise and vibration: one synthetic value per group and working day, varying around the group's baseline, see
 *   `getSyntheticDays`. They're group values, not calculated from simulated measurements per person. PM2.5 and PM10
 *   use synthetic demo baselines.
 * - whole halls: demo only, calculated from the people in all of the hall's groups
 * - KPIs: made-up examples, not calculated from anything above
 *
 * Weekends have no measurements, so they're left out rather than filled in.
 *
 * The occupational health service's demo user only has access to its own site, while management has access to every
 * site below.
 */

const STORD_SITE = "Aker Solutions Stord";
const EGERSUND_SITE = "Aker Solutions Egersund";

type SyntheticDustField = Exclude<DustField, "pm1_twa">;

type MockGroup = {
	id: string;
	site: string;
	hall: string;
	occupation: string;
	/** Only used to decide whether the backend would return the group, never sent to the frontend */
	peopleCount: number;
	baseline: Record<Exposure, number>;
	syntheticDustBaselines: Record<SyntheticDustField, number>;
};

const mockGroups: Array<MockGroup> = [
	{
		id: "hall-1-welder",
		site: OCCUPATIONAL_HEALTH_SERVICE_DEMO_SITE,
		hall: "M-hallen",
		occupation: "Welder",
		peopleCount: 12,
		baseline: { dust: 142, noise: 82, vibration: 46 },
		syntheticDustBaselines: { pm25_twa: 158, pm10_twa: 205 },
	},
	{
		id: "hall-1-technician",
		site: OCCUPATIONAL_HEALTH_SERVICE_DEMO_SITE,
		hall: "M-hallen",
		occupation: "Technician",
		peopleCount: 8,
		baseline: { dust: 96, noise: 76, vibration: 31 },
		syntheticDustBaselines: { pm25_twa: 112, pm10_twa: 168 },
	},
	{
		id: "hall-1-electrician",
		site: OCCUPATIONAL_HEALTH_SERVICE_DEMO_SITE,
		hall: "M-hallen",
		occupation: "Electrician",
		peopleCount: 6,
		baseline: { dust: 74, noise: 73, vibration: 18 },
		syntheticDustBaselines: { pm25_twa: 86, pm10_twa: 131 },
	},
	{
		id: "hall-2-welder",
		site: OCCUPATIONAL_HEALTH_SERVICE_DEMO_SITE,
		hall: "Hall 2",
		occupation: "Welder",
		peopleCount: 10,
		baseline: { dust: 171, noise: 84, vibration: 52 },
		syntheticDustBaselines: { pm25_twa: 189, pm10_twa: 244 },
	},
	{
		id: "hall-2-technician",
		site: OCCUPATIONAL_HEALTH_SERVICE_DEMO_SITE,
		hall: "Hall 2",
		occupation: "Technician",
		peopleCount: 9,
		baseline: { dust: 117, noise: 78, vibration: 27 },
		syntheticDustBaselines: { pm25_twa: 136, pm10_twa: 197 },
	},
	{
		id: "hall-2-fitter",
		site: OCCUPATIONAL_HEALTH_SERVICE_DEMO_SITE,
		hall: "Hall 2",
		occupation: "Fitter",
		peopleCount: 7,
		baseline: { dust: 133, noise: 81, vibration: 39 },
		syntheticDustBaselines: { pm25_twa: 152, pm10_twa: 226 },
	},
	{
		id: "hall-2-electrician",
		site: OCCUPATIONAL_HEALTH_SERVICE_DEMO_SITE,
		hall: "Hall 2",
		occupation: "Electrician",
		peopleCount: 3,
		baseline: { dust: 88, noise: 75, vibration: 22 },
		syntheticDustBaselines: { pm25_twa: 101, pm10_twa: 149 },
	},
	{
		id: "stord-assembly-welder",
		site: STORD_SITE,
		hall: "Montasjehallen",
		occupation: "Welder",
		peopleCount: 14,
		baseline: { dust: 158, noise: 83, vibration: 49 },
		syntheticDustBaselines: { pm25_twa: 176, pm10_twa: 231 },
	},
	{
		id: "stord-assembly-fitter",
		site: STORD_SITE,
		hall: "Montasjehallen",
		occupation: "Fitter",
		peopleCount: 9,
		baseline: { dust: 121, noise: 80, vibration: 36 },
		syntheticDustBaselines: { pm25_twa: 139, pm10_twa: 202 },
	},
	{
		id: "stord-plate-welder",
		site: STORD_SITE,
		hall: "Platehallen",
		occupation: "Welder",
		peopleCount: 11,
		baseline: { dust: 186, noise: 86, vibration: 58 },
		syntheticDustBaselines: { pm25_twa: 205, pm10_twa: 262 },
	},
	{
		id: "stord-plate-technician",
		site: STORD_SITE,
		hall: "Platehallen",
		occupation: "Technician",
		peopleCount: 6,
		baseline: { dust: 104, noise: 79, vibration: 25 },
		syntheticDustBaselines: { pm25_twa: 121, pm10_twa: 178 },
	},
	{
		id: "stord-plate-electrician",
		site: STORD_SITE,
		hall: "Platehallen",
		occupation: "Electrician",
		peopleCount: 4,
		baseline: { dust: 81, noise: 74, vibration: 17 },
		syntheticDustBaselines: { pm25_twa: 95, pm10_twa: 140 },
	},
	{
		id: "egersund-hall-a-welder",
		site: EGERSUND_SITE,
		hall: "Hall A",
		occupation: "Welder",
		peopleCount: 9,
		baseline: { dust: 129, noise: 81, vibration: 41 },
		syntheticDustBaselines: { pm25_twa: 147, pm10_twa: 196 },
	},
	{
		id: "egersund-hall-a-electrician",
		site: EGERSUND_SITE,
		hall: "Hall A",
		occupation: "Electrician",
		peopleCount: 7,
		baseline: { dust: 68, noise: 72, vibration: 15 },
		syntheticDustBaselines: { pm25_twa: 80, pm10_twa: 124 },
	},
	{
		id: "egersund-hall-b-fitter",
		site: EGERSUND_SITE,
		hall: "Hall B",
		occupation: "Fitter",
		peopleCount: 8,
		baseline: { dust: 112, noise: 79, vibration: 33 },
		syntheticDustBaselines: { pm25_twa: 128, pm10_twa: 188 },
	},
	{
		id: "egersund-hall-b-technician",
		site: EGERSUND_SITE,
		hall: "Hall B",
		occupation: "Technician",
		peopleCount: 5,
		baseline: { dust: 90, noise: 77, vibration: 24 },
		syntheticDustBaselines: { pm25_twa: 106, pm10_twa: 159 },
	},
];

type MockHall = {
	id: string;
	site: string;
	hall: string;
};

const mockHalls: Array<MockHall> = [
	{ id: "hall-1", site: OCCUPATIONAL_HEALTH_SERVICE_DEMO_SITE, hall: "M-hallen" },
	{ id: "hall-2", site: OCCUPATIONAL_HEALTH_SERVICE_DEMO_SITE, hall: "Hall 2" },
	{ id: "stord-assembly", site: STORD_SITE, hall: "Montasjehallen" },
	{ id: "stord-plate", site: STORD_SITE, hall: "Platehallen" },
	{ id: "egersund-hall-a", site: EGERSUND_SITE, hall: "Hall A" },
	{ id: "egersund-hall-b", site: EGERSUND_SITE, hall: "Hall B" },
];

function isInScope(site: string, scope: GroupSummaryRequest["site"]) {
	return scope === null || site === scope;
}

const DATA_START = new Date(2025, 0, 1);

const SUPPRESSED_DAY_SHARE = 0.06;
const SUPPRESSED_JULY_DAY_SHARE = 0.7;

/**
 * Made-up variation that develops over weeks, not a model of real exposure: two slow waves plus some of the day's own
 * draw. Lengths in calendar days, chosen so the waves don't line up with months.
 */
const WAVE_PERIOD_DAYS = [13, 29];
const WAVE_AMPLITUDE = 0.35;
const DAILY_DRAW_SHARE = 0.4;

const dailyVariation: Record<Exposure, (baseline: number, random: number) => number> = {
	// Decibels are logarithmic, so the variation is a few dB rather than a percentage
	noise: (baseline, random) => baseline + (random - 0.5) * 6,
	dust: (baseline, random) => baseline * (1 + (random - 0.5) * 0.5),
	// The same relative variation as dust. A day's draw stays within -1.1 to 2.1, so points stay above 20 % of baseline
	vibration: (baseline, random) => baseline * (1 + (random - 0.5) * 0.5),
};

type SyntheticDay = { date: Date; value: number; isSuppressed: boolean };

type PeriodRequest = Pick<GroupTrendRequest, "exposure" | "period" | "year" | "month">;

export async function fetchMockGroupSummaries(request: GroupSummaryRequest): Promise<GroupSummaryResponse> {
	// Uses the same days and average as the trend, so a group's value matches its details
	const getAverage = (group: MockGroup, exposure: Exposure) =>
		getPeriodAverage(getSyntheticDays(group, { ...request, exposure }), exposure);

	const groups = mockGroups
		.filter((group) => isInScope(group.site, request.site) && group.peopleCount >= MIN_GROUP_SIZE)
		.map((group) => ({
			groupId: group.id,
			site: group.site,
			hall: group.hall,
			occupation: group.occupation,
			averages: {
				dust: getAverage(group, "dust"),
				noise: getAverage(group, "noise"),
				vibration: getAverage(group, "vibration"),
			},
		}));

	return { units: exposureUnitByExposure, groups };
}

/** Demo-only map totals. The backend must enforce the same minimum-group privacy rule before this is replaced. */
export async function fetchMockHallWorkforce(site: GroupSummaryRequest["site"]): Promise<HallWorkforceResponse> {
	const halls = mockHalls
		.filter((hall) => isInScope(hall.site, site))
		.map((hall) => {
			const groups = getHallGroups(hall);

			return {
				site: hall.site,
				hall: hall.hall,
				peopleCount: groups.reduce((total, group) => total + group.peopleCount, 0),
				occupations: [
					...new Set(
						groups.filter((group) => group.peopleCount >= MIN_GROUP_SIZE).map((group) => group.occupation),
					),
				],
			};
		})
		.filter((hall) => hall.peopleCount >= MIN_GROUP_SIZE);

	return { halls };
}

export async function fetchMockHallSummaries(request: GroupSummaryRequest): Promise<HallSummaryResponse> {
	const halls = mockHalls
		.filter((hall) => isInScope(hall.site, request.site))
		.map((hall): HallSummary => {
			// Uses the same days and average as the hall's trend, so the hall's value matches its details
			const getAverage = (exposure: Exposure) =>
				getPeriodAverage(getHallDays(hall, { ...request, exposure }), exposure);

			return {
				groupId: hall.id,
				site: hall.site,
				hall: hall.hall,
				averages: {
					dust: getAverage("dust"),
					noise: getAverage("noise"),
					vibration: getAverage("vibration"),
				},
			};
		});

	return { units: exposureUnitByExposure, halls };
}

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
	const days = getGroupDays(group, { ...request, exposure }, request.dustField ?? defaultDustField);

	return {
		status: "ok",
		group: { level: "occupation", site: group.site, hall: group.hall, occupation: group.occupation },
		unit: exposureUnitByExposure[exposure],
		average: getPeriodAverage(days, exposure),
		granularity: "day",
		points: toDailyPoints(days, exposure),
	};
}

function getMockHallTrend(hall: MockHall, request: GroupTrendRequest): GroupTrendResponse {
	const exposure = request.exposure;
	const days = getHallDays(hall, { ...request, exposure }, request.dustField ?? defaultDustField);

	return {
		status: "ok",
		group: { level: "hall", site: hall.site, hall: hall.hall },
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
	request: PeriodRequest & { exposure: Exposure },
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

/*
 * Demo only: dust's KPI examples follow the existing definition, the share of workdays with the person's 8-hour TWA
 * above the threshold, for the requested fraction. Neither the sensor's TWA values nor TWA thresholds are documented
 * yet, see `OCCUPATIONAL_HEALTH_SERVICE_KPIS.md`, so they only show the UI and say nothing about real exposure. Until the customer has
 * confirmed both, the backend should return dust as `unavailable`.
 */

function getSyntheticKpiThresholds(exposure: Exposure, dustField: DustField) {
	const threshold = getThreshold(exposure, exposure === "dust" ? dustField : undefined);

	return { action: threshold.warning, limit: threshold.danger, unit: exposureUnitByExposure[exposure] };
}

/**
 * Made-up ranges for the KPI examples. `limitShare` is the result above the limit value as a share of the one above the
 * action value.
 */
const syntheticKpiRanges: Record<Exposure, { aboveAction: [number, number]; limitShare: [number, number] }> = {
	dust: { aboveAction: [4, 45], limitShare: [0.1, 0.45] },
	noise: { aboveAction: [10, 120], limitShare: [0.15, 0.5] },
	vibration: { aboveAction: [2, 40], limitShare: [0, 0.2] },
};

const syntheticSuppressedKpis = new Set(["hall-1-electrician:vibration"]);

export async function fetchMockExposureKpis(request: ExposureKpiRequest): Promise<ExposureKpiResponse> {
	const groupIds =
		request.level === "hall"
			? mockHalls.filter((hall) => isInScope(hall.site, request.site)).map((hall) => hall.id)
			: mockGroups
					.filter((group) => isInScope(group.site, request.site) && group.peopleCount >= MIN_GROUP_SIZE)
					.map((group) => group.id);
	const workingDayCount = getWorkingDays(request).length;
	const dustField = request.dustField ?? defaultDustField;

	return {
		period: { period: request.period, year: request.year, month: request.month },
		thresholds: {
			dust: getSyntheticKpiThresholds("dust", dustField),
			noise: getSyntheticKpiThresholds("noise", dustField),
			vibration: getSyntheticKpiThresholds("vibration", dustField),
		},
		groups: groupIds.map((groupId) => ({
			groupId,
			kpis: {
				dust: getSyntheticKpiResult(groupId, "dust", request, workingDayCount, dustField),
				noise: getSyntheticKpiResult(groupId, "noise", request, workingDayCount, dustField),
				vibration: getSyntheticKpiResult(groupId, "vibration", request, workingDayCount, dustField),
			},
		})),
	};
}

function getSyntheticKpiResult(
	groupId: string,
	exposure: Exposure,
	request: ExposureKpiRequest,
	workingDayCount: number,
	dustField: DustField,
): ExposureKpiResult {
	if (workingDayCount === 0) {
		return { status: "noData" };
	}

	// Most people are on summer holiday in July, so a group's July is hidden, while a hall still has enough people
	const isJulyForGroup = request.level === "occupation" && request.period === "month" && request.month === 6;

	if (isJulyForGroup || syntheticSuppressedKpis.has(`${groupId}:${exposure}`)) {
		return { status: "suppressed" };
	}

	const exposureKey = exposure === "dust" ? `${exposure}:${dustField}` : exposure;
	const random = seedrandom(`${groupId}:kpi:${exposureKey}:${request.period}:${request.year}:${request.month}`);
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
	request: PeriodRequest & { exposure: Exposure },
	dustField: DustField,
): Array<SyntheticDay> {
	return request.exposure === "dust" && dustField !== "pm1_twa"
		? getSyntheticDays(group, request, group.syntheticDustBaselines[dustField])
		: getSyntheticDays(group, request);
}

type PeriodSelectionRequest = Pick<GroupTrendRequest, "period" | "year" | "month">;

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
	{ exposure, ...period }: PeriodRequest & { exposure: Exposure },
	baseline = group.baseline[exposure],
): Array<SyntheticDay> {
	const seed = `${group.id}:${exposure}`;
	const monthAverages = new Map<string, { draw: number; wave: number }>();

	return getWorkingDays(period).map((date) => {
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

function getMonthAverages(seed: string, date: Date) {
	const days = getWorkingDays({ period: "month", year: date.getFullYear(), month: date.getMonth() });
	const average = (values: Array<number>) => values.reduce((sum, value) => sum + value, 0) / values.length;

	return {
		draw: average(days.map((day) => seedrandom(`${seed}:${formatDate(day, "yyyy-MM-dd")}`)())),
		wave: average(days.map((day) => getWave(seed, day))),
	};
}

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
function getPeriodAverage(days: Array<SyntheticDay>, exposure: Exposure): number | null {
	if (days.length === 0) {
		return null;
	}

	return round(days.reduce((sum, day) => sum + day.value, 0) / days.length, exposure);
}

function toDailyPoints(days: Array<SyntheticDay>, exposure: Exposure): Array<GroupTrendPoint> {
	return days.map((day) => ({
		time: formatDate(day.date, "yyyy-MM-dd"),
		value: day.isSuppressed ? null : round(day.value, exposure),
	}));
}

function round(value: number, exposure: Exposure) {
	return Number(value.toFixed(exposure === "dust" ? 0 : 1));
}

function sumOf(values: Array<number>) {
	return values.reduce((total, value) => total + value, 0);
}
