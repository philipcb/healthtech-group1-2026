import {
	type ExposureKpiRequest,
	ExposureKpiResponseSchema,
	type GroupSummaryRequest,
	GroupSummaryResponseSchema,
	type GroupTrendRequest,
	GroupTrendResponseSchema,
	HallSummaryResponseSchema,
	HallWorkforceResponseSchema,
} from "@/features/occupational-health-service/queries/occupational-health-service-contracts.ts";
import {
	fetchMockExposureKpis,
	fetchMockGroupSummaries,
	fetchMockGroupTrend,
	fetchMockHallSummaries,
	fetchMockHallWorkforce,
} from "@/features/occupational-health-service/queries/occupational-health-service-mock-data.ts";
import { queryOptions } from "@tanstack/react-query";
import { minutesToMilliseconds } from "date-fns";

/*
 * Every response comes from mock data for now and is parsed like an API response, so the mock follows the contracts.
 * Parsing only checks the shape, not privacy.
 */

export function groupSummariesQueryOptions(request: GroupSummaryRequest) {
	return queryOptions({
		queryKey: ["occupationalHealthService", "groupSummaries", request],
		// TODO: Fetch from the aggregate API once it exists
		queryFn: async () => GroupSummaryResponseSchema.parseAsync(await fetchMockGroupSummaries(request)),
		staleTime: minutesToMilliseconds(10),
	});
}

/** Demo only, see `HallSummarySchema`. Not to be connected to real data before the backend protects it. */
export function hallSummariesQueryOptions(request: GroupSummaryRequest) {
	return queryOptions({
		queryKey: ["occupationalHealthService", "hallSummaries", request],
		queryFn: async () => HallSummaryResponseSchema.parseAsync(await fetchMockHallSummaries(request)),
		staleTime: minutesToMilliseconds(10),
	});
}

/** Demo-only anonymous building counts for the site map. */
export function hallWorkforceQueryOptions(site: string) {
	return queryOptions({
		queryKey: ["occupationalHealthService", "hallWorkforce", site],
		queryFn: async () => HallWorkforceResponseSchema.parseAsync(await fetchMockHallWorkforce(site)),
		staleTime: minutesToMilliseconds(10),
	});
}

/** Made-up examples, see `fetchMockExposureKpis` */
export function exposureKpisQueryOptions(request: ExposureKpiRequest) {
	return queryOptions({
		queryKey: ["occupationalHealthService", "exposureKpis", request],
		// TODO: Fetch from the aggregate API once it delivers what `OCCUPATIONAL_HEALTH_SERVICE_KPIS.md` describes
		queryFn: async () => ExposureKpiResponseSchema.parseAsync(await fetchMockExposureKpis(request)),
		staleTime: minutesToMilliseconds(10),
	});
}

export function groupTrendQueryOptions(request: GroupTrendRequest) {
	return queryOptions({
		queryKey: ["occupationalHealthService", "groupTrend", request],
		// TODO: Fetch from the aggregate API once it exists. The backend must also check that the group belongs to the
		// occupational health service's site.
		queryFn: async () => GroupTrendResponseSchema.parseAsync(await fetchMockGroupTrend(request)),
		staleTime: minutesToMilliseconds(10),
	});
}
