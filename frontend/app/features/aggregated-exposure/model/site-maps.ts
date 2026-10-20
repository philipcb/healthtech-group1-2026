import { xyToyx } from "@/features/location-map/location-map-utils.ts";
import { OCCUPATIONAL_HEALTH_SERVICE_DEMO_SITE } from "@/features/user/user-utils.ts";

export type SiteMapConfig = {
	image: string;
	buildingPositions: Record<string, Array<[number, number]>>;
};

/** Only the occupational health service's demo site has a site map so far */
export const siteMaps: Partial<Record<string, SiteMapConfig>> = {
	[OCCUPATIONAL_HEALTH_SERVICE_DEMO_SITE]: {
		image: "/aker_verdal_sitemap.jpg",
		buildingPositions: {
			"M-hallen": [xyToyx(440, 255), xyToyx(875, 255), xyToyx(875, 125), xyToyx(440, 125)],
			"Hall 2": [xyToyx(1410, 585), xyToyx(1760, 585), xyToyx(1760, 310), xyToyx(1410, 310)],
		},
	},
};

export function hasSiteMap(site: string) {
	return siteMaps[site] !== undefined;
}
