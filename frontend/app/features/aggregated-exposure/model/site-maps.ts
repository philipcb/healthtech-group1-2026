import type { GroupSummary } from "@/features/aggregated-exposure/model/groups.ts";
import { xyToyx } from "@/features/location-map/location-map-utils.ts";

export type SiteMapConfig = {
	image: string;
	/** Keyed by the hall name the aggregate API returns. Halls without a position are only listed. */
	buildingPositions: Partial<Record<string, Array<[number, number]>>>;
};

/**
 * Only Verdal has a site map so far. The positions are the ones the map had before it used the aggregate API.
 * TODO: A-hallen uses the position of "Hall 2" from the old mock data, which hasn't been confirmed to be where A-hallen
 * is on the map.
 */
export const siteMaps: Partial<Record<string, SiteMapConfig>> = {
	"Aker Solutions Verdal": {
		image: "/aker_verdal_sitemap.jpg",
		buildingPositions: {
			"M-hallen": [xyToyx(440, 255), xyToyx(875, 255), xyToyx(875, 125), xyToyx(440, 125)],
			"A-hallen": [xyToyx(1410, 585), xyToyx(1760, 585), xyToyx(1760, 310), xyToyx(1410, 310)],
		},
	},
};

export function hasSiteMap(site: string) {
	return siteMaps[site] !== undefined;
}

/**
 * TODO: Mock data. Replace with head counts from the aggregate API, which doesn't send them yet. These are the totals the
 * map showed per building before it used the aggregate API (the mock data removed in fd73d73), with "Hall 2"'s count
 * for A-hallen.
 */
const MOCK_PEOPLE_COUNTS: Partial<Record<string, Partial<Record<string, number>>>> = {
	"Aker Solutions Verdal": { "M-hallen": 26, "A-hallen": 29 },
};

export type Building = {
	site: string;
	hall: string;
	occupations: Array<string>;
	/** `null` for halls without a mock head count */
	peopleCount: number | null;
};

/**
 * The halls of the aggregate API's groups, with the occupations that have a group in each, sorted by name. Only the
 * head counts are mock data.
 */
export function getBuildings(groups: Array<GroupSummary>, site: string): Array<Building> {
	const occupationsByHall = Map.groupBy(
		groups.filter((group) => group.site === site),
		(group) => group.hall,
	);

	return [...occupationsByHall]
		.map(([hall, hallGroups]) => ({
			site,
			hall,
			occupations: [...new Set(hallGroups.map((group) => group.occupation))].toSorted((a, b) =>
				a.localeCompare(b),
			),
			peopleCount: MOCK_PEOPLE_COUNTS[site]?.[hall] ?? null,
		}))
		.toSorted((a, b) => a.hall.localeCompare(b.hall));
}
