import type { GroupSummaryRequest } from "@/features/aggregated-exposure/api/contracts.ts";
import type { ComponentType } from "react";

export type YardFilterProps = {
	yards: Array<string>;
	/** `null`, or a yard that isn't in `yards`, shows every yard */
	value: string | null;
	onValueChange: (yard: string | null) => void;
	/** Whether every yard can be picked at once, which the site map can't show */
	allowsAll?: boolean;
};

/**
 * What differs between the roles that share the dashboard. Each role's feature provides its own scope, so the shared
 * pages and components never check the user's role.
 */
export type DashboardScope = {
	/**
	 * The site the data is fetched for, or `null` for every site the user has access to. The groups can then be from
	 * several sites, so they're shown with their site.
	 */
	site: GroupSummaryRequest["site"];
	title: string;
	description?: string;
	/** Whether the overview guide's introduction, its note on what the colors aren't and the site map's hint are shown */
	showsGuidance: boolean;
	overviewPath: string;
	getGroupPath: (groupId: string) => string;
	/** Narrows a scope with every site to one yard */
	YardFilter?: ComponentType<YardFilterProps>;
};

/** Sorted by name, since the backend doesn't promise an order */
export function getYards(items: Array<{ site: string }> | undefined) {
	return [...new Set(items?.map((item) => item.site))].toSorted((a, b) => a.localeCompare(b));
}
