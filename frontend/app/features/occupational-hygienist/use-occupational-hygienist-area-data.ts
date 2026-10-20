import { OLA_NORDMANN_ID } from "@/features/user/user-utils.ts";
import { useGetSubordinates, useGetThresholdSummary } from "@/lib/api/generated/user.ts";
import { withMissingCountsAsZero } from "@/lib/threshold-summary.ts";

type TimeRange = { startTime: string; endTime: string };

/**
 * The user whose team makes up the occupational hygienist's area.
 *
 * NOTE: The occupational hygienist is a frontend-only demo role, so the backend doesn't know which operators they can
 * see. Until it does, the hygienist borrows the team of the foreman at Verdal (M-hallen) to show live data.
 */
const AREA_MANAGER_ID = OLA_NORDMANN_ID;

/** The operators in the occupational hygienist's area, and how many of them are within each danger level */
export function useOccupationalHygienistAreaData(timeRange: TimeRange) {
	const {
		data: operators,
		isLoading: isOperatorsLoading,
		error: operatorsError,
	} = useGetSubordinates(AREA_MANAGER_ID, timeRange);
	const { data: thresholdSummary, isLoading: isThresholdSummaryLoading } = useGetThresholdSummary(
		AREA_MANAGER_ID,
		timeRange,
		{ query: { select: withMissingCountsAsZero } },
	);

	return { operators, isOperatorsLoading, operatorsError, thresholdSummary, isThresholdSummaryLoading };
}
