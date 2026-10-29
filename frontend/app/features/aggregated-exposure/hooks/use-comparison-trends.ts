import type { ComparedEntry } from "@/features/aggregated-exposure/model/compare.ts";
import { isExposureUnavailable } from "@/features/aggregated-exposure/model/groups.ts";
import type { toPeriodParams } from "@/features/aggregated-exposure/model/period.ts";
import { getGetAggregateGroupTrendQueryOptions } from "@/lib/api/generated/aggregate-exposure-data.ts";
import type { AggregatedTrendOkDto } from "@/lib/api/generated/models/index.ts";
import type { DustField, Exposure } from "@/lib/exposures.ts";
import { useQueries } from "@tanstack/react-query";

export type MissingStatus = "noData" | "notEnoughData" | "unavailable";

export type GroupResult =
	| { status: "pending" }
	| { status: "error"; retry: () => void }
	| { status: MissingStatus }
	| { status: "ok"; trend: AggregatedTrendOkDto };

export function isMissing(result: GroupResult): result is { status: MissingStatus } {
	return result.status === "noData" || result.status === "notEnoughData" || result.status === "unavailable";
}

export function useComparisonTrends({
	entries,
	exposure,
	dustField,
	periodParams,
}: {
	entries: Array<ComparedEntry>;
	exposure: Exposure;
	dustField: DustField;
	periodParams: ReturnType<typeof toPeriodParams>;
}): Array<GroupResult> {
	const isUnavailable = isExposureUnavailable(exposure);

	return useQueries({
		queries: entries.map(({ group }) =>
			getGetAggregateGroupTrendQueryOptions(
				group.groupId,
				{ exposure, dustField: exposure === "dust" ? dustField : undefined, ...periodParams },
				{ query: { enabled: !isUnavailable } },
			),
		),
		combine: (queries) =>
			queries.map((query): GroupResult => {
				if (query.isPending) return { status: "pending" };
				if (query.isError) return { status: "error", retry: () => void query.refetch() };
				const trend = query.data;
				if (trend.status === "unavailable") {
					// The backend answers `noSuchGroup` for a group it has, but without measurements in the period
					return { status: trend.reason === "exposureUnavailable" ? "unavailable" : "noData" };
				}
				if (trend.points.length === 0) return { status: "noData" };
				return trend.points.some((point) => point.value !== null)
					? { status: "ok", trend }
					: { status: "notEnoughData" };
			}),
	});
}
