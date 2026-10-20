import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { hallWorkforceQueryOptions } from "@/features/aggregated-exposure/api/queries.ts";
import { useDashboardScope } from "@/features/aggregated-exposure/hooks/use-dashboard-scope.ts";
import { getOccupationLabel, MIN_GROUP_SIZE } from "@/features/aggregated-exposure/model/groups.ts";
import { siteMaps } from "@/features/aggregated-exposure/model/site-maps.ts";
import { getCenterPoint } from "@/features/location-map/location-map-utils.ts";
import { useImageSize } from "@/features/location-map/use-image-size.tsx";
import { useQuery } from "@tanstack/react-query";
import L, { type LatLngBoundsExpression } from "leaflet";
import { Building2, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { renderToString } from "react-dom/server";
import { useTranslation } from "react-i18next";
import { ImageOverlay, MapContainer, Marker, Polygon } from "react-leaflet";

function createCountIcon(count: number, selected: boolean) {
	const color = selected ? "var(--primary)" : "var(--foreground)";
	const background = selected ? "var(--primary-foreground)" : "var(--background)";
	const html = renderToString(
		<div
			className="flex h-9 min-w-9 items-center justify-center rounded-full border-2 px-2 font-semibold text-sm shadow-md"
			style={{ color, background, borderColor: "var(--primary)" }}
		>
			{count}
		</div>,
	);

	return L.divIcon({ className: "", html, iconSize: [42, 42], iconAnchor: [21, 21] });
}

/**
 * The site's buildings, on its site map when it has one. Sites without one only list their buildings. Meant to be
 * rendered with the site as its `key`, so the selected building doesn't carry over to another site.
 */
export function SiteMap({ site }: { site: string }) {
	const { t } = useTranslation();
	const scope = useDashboardScope();
	const siteMap = siteMaps[site];
	const imageSize = useImageSize(siteMap?.image);
	const mapRef = useRef<L.Map | null>(null);
	const [selectedHall, setSelectedHall] = useState<string | null>(null);
	const { data, isPending, isError } = useQuery(hallWorkforceQueryOptions(scope.site));

	const buildings = useMemo(
		() =>
			(data?.halls ?? []).filter(
				(hall) => hall.site === site && (!siteMap || siteMap.buildingPositions[hall.hall]),
			),
		[data, site, siteMap],
	);
	const selectedBuilding = buildings.find((building) => building.hall === selectedHall) ?? null;
	const bounds = useMemo<LatLngBoundsExpression | null>(
		() =>
			imageSize
				? [
						[0, 0],
						[imageSize.height, imageSize.width],
					]
				: null,
		[imageSize],
	);

	useEffect(() => {
		if (!(mapRef.current && bounds)) return;

		const positions = selectedHall ? siteMap?.buildingPositions[selectedHall] : null;
		mapRef.current.fitBounds(positions ? L.latLngBounds(positions) : bounds, {
			padding: [24, 24],
			maxZoom: positions ? 1 : 0,
		});
	}, [bounds, selectedHall, siteMap]);

	if ((siteMap && !(imageSize && bounds)) || isPending) {
		return <Skeleton className="w-full rounded-lg" style={{ aspectRatio: "16 / 9" }} />;
	}

	if (isError) {
		return <p className="text-destructive text-sm">{t(($) => $.aggregatedExposure.map.error)}</p>;
	}

	return (
		<Card className="overflow-hidden rounded-lg">
			<CardContent className="gap-4 p-3 sm:p-4">
				<div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
					<aside className="flex flex-col gap-2">
						<p className="px-2 font-medium text-sm">{t(($) => $.aggregatedExposure.map.buildings)}</p>
						{buildings.map((building) => {
							const active = selectedHall === building.hall;
							return (
								<button
									key={building.hall}
									type="button"
									aria-pressed={active}
									onClick={() => setSelectedHall(active ? null : building.hall)}
									className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${active ? "border-primary bg-accent" : "border-transparent hover:bg-muted"}`}
								>
									<Building2 aria-hidden="true" className="size-4 shrink-0 text-primary" />
									<span className="min-w-0 flex-1 truncate font-medium">{building.hall}</span>
									<span className="inline-flex items-center gap-1.5 text-muted-foreground text-sm tabular-nums">
										<Users aria-hidden="true" className="size-4" />
										{building.peopleCount}
									</span>
								</button>
							);
						})}
						{selectedBuilding ? (
							<div className="mt-2 border-t px-2 pt-4">
								<p className="text-muted-foreground text-xs">
									{t(($) => $.aggregatedExposure.map.selectedBuilding)}
								</p>
								<h2 className="mt-1 font-semibold">{selectedBuilding.hall}</h2>
								<p className="mt-3 flex items-center gap-2 font-medium text-sm">
									<Users aria-hidden="true" className="size-4 text-primary" />
									{t(($) => $.aggregatedExposure.map.peopleWorkingHere, {
										count: selectedBuilding.peopleCount,
									})}
								</p>
								<div className="mt-4">
									<p className="font-medium text-sm">
										{t(($) => $.aggregatedExposure.map.occupations)}
									</p>
									<ul className="mt-2 flex flex-wrap gap-2">
										{selectedBuilding.occupations.map((occupation) => (
											<li
												key={occupation}
												className="rounded-md border bg-background px-2 py-1 text-sm"
											>
												{getOccupationLabel(occupation, t)}
											</li>
										))}
									</ul>
								</div>
							</div>
						) : (
							scope.showsGuidance && (
								<p className="mt-2 border-t px-2 pt-4 text-muted-foreground text-sm">
									{t(($) => $.aggregatedExposure.map.selectBuilding)}
								</p>
							)
						)}
						<p className="mt-auto border-t px-2 pt-3 text-muted-foreground text-xs">
							{t(($) => $.aggregatedExposure.privacyNotice, { count: MIN_GROUP_SIZE })}
						</p>
					</aside>

					{siteMap && imageSize && bounds ? (
						<div className="min-w-0 overflow-hidden rounded-md border">
							<div style={{ aspectRatio: `${imageSize.width} / ${imageSize.height}` }}>
								<MapContainer
									ref={mapRef}
									crs={L.CRS.Simple}
									bounds={bounds}
									maxBounds={bounds}
									maxBoundsViscosity={1}
									minZoom={-1}
									maxZoom={2}
									zoomSnap={0}
									style={{ height: "100%", width: "100%", background: "var(--background)" }}
								>
									<ImageOverlay url={siteMap.image} bounds={bounds} />
									{buildings.map((building) => {
										const positions = siteMap.buildingPositions[building.hall];
										const active = selectedHall === building.hall;
										const color = active ? "var(--primary)" : "var(--safe)";

										return (
											<Polygon
												key={building.hall}
												positions={positions}
												pathOptions={{
													color,
													fillColor: color,
													weight: active ? 3 : 2,
													fillOpacity: active ? 0.36 : 0.2,
												}}
												eventHandlers={{
													click: () => setSelectedHall(active ? null : building.hall),
												}}
											/>
										);
									})}
									{buildings.map((building) => (
										<Marker
											key={`${building.hall}-count`}
											position={getCenterPoint(siteMap.buildingPositions[building.hall])}
											icon={createCountIcon(building.peopleCount, selectedHall === building.hall)}
											eventHandlers={{ click: () => setSelectedHall(building.hall) }}
										/>
									))}
								</MapContainer>
							</div>
						</div>
					) : (
						<div className="flex min-h-48 items-center justify-center rounded-md border border-dashed p-6 text-center text-muted-foreground text-sm">
							{t(($) => $.aggregatedExposure.map.noSiteMap)}
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
