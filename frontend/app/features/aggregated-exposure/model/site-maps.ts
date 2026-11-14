import {
	type GroupSummary,
	hideUnavailableAverages,
	toGroupSummaries,
} from "@/features/aggregated-exposure/model/groups.ts";
import { getBuildingLabel, siteMaps } from "@/features/location-map/site-map-config.ts";
import type { AggregatedOverviewResponseDto, SampleDto } from "@/lib/api/generated/models/index.ts";

/** The averages of a whole hall, across its occupations, and how many operators they're from */
export type HallSummary = Pick<SampleDto, "site" | "workerCount" | "averages"> & { hall: string };

/**
 * The aggregate API's groups, for `useGetAggregateGroups`'s `select` on the map. Like `toGroupSummaries`, plus the
 * whole halls it leaves out, which the map colors its buildings by.
 */
export function toSiteMapSummaries(response: AggregatedOverviewResponseDto) {
	return {
		...toGroupSummaries(response),
		halls: response.groups.flatMap(
			({ site, hall, occupation, workerCount, averages }): Array<HallSummary> =>
				hall !== null && occupation === null
					? [{ site, hall, workerCount, averages: hideUnavailableAverages(averages) }]
					: [],
		),
	};
}

export type Building = {
	site: string;
	/** The backend's name for the building */
	hall: string;
	/** The building's name on the site map, see `getBuildingLabel` */
	label: string;
	/** Empty for a building on the site map without any groups */
	occupations: Array<string>;
	/**
	 * How many operators the whole hall's averages are from. Foremen, management and the occupational health service
	 * aren't counted. `null` when the aggregate API didn't send the whole hall, because fewer than `MIN_GROUP_SIZE`
	 * operators work there and they're hidden to keep them anonymous.
	 */
	peopleCount: number | null;
	/** `null` when the aggregate API didn't send the whole hall */
	averages: SampleDto["averages"] | null;
};

/**
 * The halls of the aggregate API's groups and the buildings on the site's map, with the occupations that have a group
 * in each, sorted by label. Buildings on the map without any groups are included, so the whole yard is shown.
 */
export function getBuildings(groups: Array<GroupSummary>, halls: Array<HallSummary>, site: string): Array<Building> {
	const occupationsByHall = Map.groupBy(
		groups.filter((group) => group.site === site),
		(group) => group.hall,
	);
	const hallNames = new Set([...occupationsByHall.keys(), ...Object.keys(siteMaps[site]?.buildings ?? {})]);

	return [...hallNames]
		.map((hall) => {
			const wholeHall = halls.find((summary) => summary.site === site && summary.hall === hall);

			return {
				site,
				hall,
				label: getBuildingLabel(site, hall),
				occupations: [...new Set(occupationsByHall.get(hall)?.map((group) => group.occupation))].toSorted(
					(a, b) => a.localeCompare(b),
				),
				peopleCount: wholeHall?.workerCount ?? null,
				averages: wholeHall?.averages ?? null,
			};
		})
		.toSorted((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
}
