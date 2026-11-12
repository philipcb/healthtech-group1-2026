import { Card, CardContent } from "@/components/ui/card.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import type { UserWithStatusDto } from "@/lib/api/generated/models/index.ts";
import { dangerlevelStyles, getHighestDangerLevel, mapDangerLevelToColor } from "@/lib/danger-levels.ts";
import { type Exposure, exposures } from "@/lib/exposures.ts";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { HallOperatorList, HallOperatorListSkeleton } from "./hall-operator-list.tsx";
import { MapUsersBadge } from "./location-map-users-badge.tsx";
import { getHalls } from "./location-map-utils.ts";
import { siteMaps } from "./site-map-config.ts";
import { YardMap, type YardMapBuilding } from "./yard-map.tsx";

type LocationMapProps = {
	/** The yard whose map is shown: the foreman's own, so a foreman only sees where they work */
	site: string;
	operators: Array<UserWithStatusDto>;
	isLoading?: boolean;
};

/** Halls without operators are drawn in a muted grey, so the buildings with people in them stand out */
const EMPTY_HALL_COLOR = "var(--muted-foreground)";

/**
 * The foreman's team on their yard's map, with each operator in the building of their location and the operators'
 * live status. Every building on the site map is shown, also those without operators. A yard without a site map only
 * gets the list.
 */
export function LocationMap({ site, operators, isLoading }: LocationMapProps) {
	const siteMap = siteMaps[site];
	const { t } = useTranslation();

	const [exposure, setExposure] = useQueryState(
		"mapExposure",
		parseAsStringLiteral(["all", ...exposures]).withDefault("all"),
	);

	const highestDangerLevel = getHighestDangerLevel(operators, exposure === "all" ? null : exposure);

	const hallOverlayColor =
		exposure === "all" ? "var(--color-blue-600)" : `var(--${mapDangerLevelToColor(highestDangerLevel)})`;

	const markerColor = exposure === "all" ? "bg-teal-700" : dangerlevelStyles[highestDangerLevel].bg;

	const halls = useMemo(() => getHalls(site, operators), [site, operators]);

	const [selectedHallName, setSelectedHallName] = useState<string | null>(
		() => halls.find((hall) => hall.operators.length > 0)?.name ?? null,
	);

	const mapBuildings = halls.flatMap((hall): Array<YardMapBuilding> => {
		if (!hall.outlines) {
			return [];
		}

		const hasOperators = hall.operators.length > 0;

		return [
			{
				id: hall.name,
				label: hall.label,
				outlines: hall.outlines,
				color: hasOperators ? hallOverlayColor : EMPTY_HALL_COLOR,
				badge: hasOperators ? (
					<MapUsersBadge count={hall.operators.length} badgeBgClassName={markerColor} isLoading={isLoading} />
				) : undefined,
			},
		];
	});

	return (
		<Card className="overflow-hidden">
			<CardContent>
				<div className="flex h-full w-full flex-col gap-4 lg:flex-row">
					<div className="flex max-h-[70vh] w-full min-w-0 flex-col gap-1 overflow-y-auto border-b-2 border-solid pb-2 lg:w-72 lg:min-w-72 lg:border-r-2 lg:border-b-0 lg:pr-2 lg:pb-0">
						{isLoading ? (
							<>
								<HallOperatorListSkeleton />
								<HallOperatorListSkeleton />
								<HallOperatorListSkeleton />
								<HallOperatorListSkeleton />
							</>
						) : (
							halls.map((hall) => (
								<HallOperatorList
									key={hall.name}
									exposure={exposure}
									operators={hall.operators}
									hallName={hall.name}
									label={hall.label}
									selectedHall={selectedHallName}
									onOpenChange={setSelectedHallName}
								/>
							))
						)}
					</div>

					<div className="w-full min-w-0">
						<ToggleGroup
							type="single"
							value={exposure}
							variant="outline"
							className="mb-4 inline-grid auto-cols-fr grid-flow-col"
							onValueChange={(value: Exposure | "all" | "") => {
								if (value) {
									setExposure(value);
								}
							}}
						>
							<ToggleGroupItem value="all">{t(($) => $.exposures.overview)}</ToggleGroupItem>

							{exposures.map((s) => (
								<ToggleGroupItem key={s} value={s}>
									{t(($) => $.exposures[s])}
								</ToggleGroupItem>
							))}
						</ToggleGroup>

						{siteMap ? (
							<YardMap
								site={site}
								buildings={mapBuildings}
								selectedBuilding={selectedHallName}
								onSelect={setSelectedHallName}
							/>
						) : (
							<div className="flex min-h-48 items-center justify-center rounded-md border border-dashed p-6 text-center text-muted-foreground text-sm">
								{t(($) => $.aggregatedExposure.map.noSiteMap)}
							</div>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
