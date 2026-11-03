import { hasNoActiveSensors } from "@/features/attention-card/inactive-sensors.ts";
import type { UserWithStatusDto } from "@/lib/api/generated/models/index.ts";
import { parseAsStringLiteral } from "nuqs";

/** The groups the team status cards count, and the team table can be narrowed to */
export const teamStatusFilters = ["danger", "warning", "safe", "inactive"] as const;
export type TeamStatusFilter = (typeof teamStatusFilters)[number];
export const parseAsTeamStatusFilter = parseAsStringLiteral(teamStatusFilters);

/** Members are grouped by their highest danger level, and "inactive" means no data for any exposure */
export function matchesTeamStatusFilter(member: UserWithStatusDto, filter: TeamStatusFilter): boolean {
	return filter === "inactive"
		? hasNoActiveSensors(member)
		: member.status.status === filter && !hasNoActiveSensors(member);
}
