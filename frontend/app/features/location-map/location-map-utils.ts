import type { UserWithStatusDto } from "@/lib/api/generated/models/index.ts";
import { getBuildingLabel, getOutlines, type LngLat, type SiteMapBuilding, siteMaps } from "./site-map-config.ts";

const buildingOutlines = (building: SiteMapBuilding | undefined) => (building ? getOutlines(building) : undefined);

export type Hall = {
	/** The backend's name for the building, or the yard's name for operators without a building there */
	name: string;
	label: string;
	/** `undefined` for a hall that isn't on the site map */
	outlines: Array<Array<LngLat>> | undefined;
	operators: Array<UserWithStatusDto>;
};

/**
 * Every building on the site's map, plus the buildings of the operators' locations, with the operators in each.
 * Operators without a building, or at another yard, are listed under their yard's name, so nobody is left out. Halls
 * with operators come first, then by label.
 */
export function getHalls(site: string, operators: Array<UserWithStatusDto>): Array<Hall> {
	const operatorsByHall = Map.groupBy(operators, ({ location }) =>
		location.site === site && location.building !== null ? location.building : location.site,
	);
	const buildings = siteMaps[site]?.buildings ?? {};
	const hallNames = new Set([...Object.keys(buildings), ...operatorsByHall.keys()]);

	return [...hallNames]
		.map((name) => ({
			name,
			label: getBuildingLabel(site, name),
			outlines: buildingOutlines(buildings[name]),
			operators: operatorsByHall.get(name) ?? [],
		}))
		.toSorted(
			(a, b) =>
				Number(b.operators.length > 0) - Number(a.operators.length > 0) ||
				a.label.localeCompare(b.label, undefined, { numeric: true }),
		);
}
