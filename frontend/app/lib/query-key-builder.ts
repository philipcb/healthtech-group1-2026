import type { TZDate } from "@date-fns/tz";
import { startOfDay } from "date-fns";
import type { ExposureDataRequestDto, ExposureOverviewRequestDto } from "./dto/exposure.ts";
import { type Exposure, exposures } from "./exposures.ts";

/**
 * For queries that fetches data for exact time-ranges and not just whole days, `windowed` should be used.
 * If not, startTime and endTime will be normalized to the start of their respective days to ensure cache key consistency.
 */
export type ExposureQueryKind = "default" | "windowed";

function toDayTimestamp(date: TZDate | undefined): number | null {
	return date ? startOfDay(date).getTime() : null;
}

function buildExposureQueryCachePart({
	query,
	queryKind,
	windowMinutes,
}: {
	query?: ExposureDataRequestDto;
	queryKind?: ExposureQueryKind;
	windowMinutes?: number;
}) {
	if (!query) {
		return ["disabled"];
	}

	const base = [query.field ?? null, query.granularity, query.function];

	if (queryKind === "windowed") {
		return [...base, "windowed", windowMinutes ?? null];
	}

	return [...base, toDayTimestamp(query.startTime), toDayTimestamp(query.endTime)];
}

export function buildExposureQueryKey({
	exposure,
	userId,
	query,
	queryKind,
	windowMinutes,
}: {
	exposure: Exposure;
	userId?: string;
	query?: ExposureDataRequestDto;
	queryKind?: ExposureQueryKind;
	windowMinutes?: number;
}) {
	return ["exposure", userId ?? null, exposure, ...buildExposureQueryCachePart({ query, queryKind, windowMinutes })];
}

export function buildExposureOverviewQueryKey({
	query,
	userId,
	queryKind,
	windowMinutes,
}: {
	query: ExposureOverviewRequestDto;
	userId?: string;
	queryKind?: ExposureQueryKind;
	windowMinutes?: number;
}) {
	const exposureKeys = exposures.map((exposure) => [
		exposure,
		...buildExposureQueryCachePart({
			query: query[exposure],
			queryKind,
			windowMinutes,
		}),
	]);

	return ["exposure-overview", userId ?? null, ...exposureKeys.flat()];
}

export function buildSubordinatesQueryKey(userId: string, startTime?: TZDate, endTime?: TZDate) {
	return ["user.subordinates", userId, toDayTimestamp(startTime), toDayTimestamp(endTime)];
}

export function buildNotesQueryKey(userId: string, startTime: TZDate, endTime: TZDate) {
	const start = startOfDay(startTime).getTime();
	const end = startOfDay(endTime).getTime();

	return ["notes", userId, start, end];
}

export function buildThresholdSummaryQueryKey(userId: string, startTime?: TZDate, endTime?: TZDate) {
	return ["user.subordinates.threshold-summary", userId, toDayTimestamp(startTime), toDayTimestamp(endTime)];
}

export function buildNotesQueryKeyPrefix(userId: string) {
	return ["notes", userId];
}

export function buildSubordinatesQueryPrefix(userId: string) {
	return ["user.subordinates", userId];
}
