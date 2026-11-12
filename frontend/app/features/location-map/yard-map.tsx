import "mapbox-gl/dist/mapbox-gl.css";
import { Toggle } from "@/components/ui/toggle.tsx";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group.tsx";
import { useTheme } from "@/features/dark-mode/use-theme.ts";
import { cn } from "@/lib/utils.ts";
import { Maximize2, Minimize2, X } from "lucide-react";
import type { StyleSpecification } from "mapbox-gl";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import MapboxMap, {
	Layer,
	type MapMouseEvent,
	type MapRef,
	Marker,
	NavigationControl,
	ScaleControl,
	Source,
} from "react-map-gl/mapbox";
import { mixMapColors, toMapColor } from "./map-color.ts";
import { getBounds, getBuildingHeight, getCenter, getOutlines, type LngLat, siteMaps } from "./site-map-config.ts";

export type YardMapBuilding = {
	/** Identifies the building in `selectedBuilding` and `onSelect` */
	id: string;
	label: string;
	/** The building's pieces, usually one */
	outlines: Array<Array<LngLat>>;
	/** Any CSS color, including the theme's variables, see `toMapColor` */
	color: string;
	/** Shown in a marker on the building, such as how many people work there. Left out for no marker. */
	badge?: ReactNode;
};

type YardMapProps = {
	site: string;
	buildings: Array<YardMapBuilding>;
	selectedBuilding: string | null;
	onSelect: (building: string | null) => void;
	/** About the selected building, shown in a card on the map with a button that deselects it */
	details?: ReactNode;
};

/**
 * Mapbox's public token (pk.), which is in the code so the map works for everyone, locally and on the server. A public
 * token is meant to be seen in the browser. It belongs to a personal free account, so the map stops if that account or
 * token is removed. `VITE_MAPBOX_ACCESS_TOKEN` in `.env` replaces it, for example with a token from Aker's own account.
 */
const DEFAULT_ACCESS_TOKEN =
	"pk.eyJ1Ijoib2xhZWxnYWFlbiIsImEiOiJjbXcxNnR3NXcwNXFqMnpzajdxb3Y1MGdlIn0.NX2i-niqVPYMDvH4Mnt2CQ";
const ACCESS_TOKEN: string = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || DEFAULT_ACCESS_TOKEN;

/**
 * Mapbox's satellite imagery, served as tiles by its Static Tiles API. Used instead of the ready-made
 * `mapbox://styles/mapbox/satellite-streets-v12` style, whose raster satellite tiles Mapbox refuses (429) for our
 * account. If raster tiles are enabled for the account later, this can be swapped back for that style URL.
 */
const SATELLITE_STYLE: StyleSpecification = {
	version: 8,
	// For the buildings' labels
	glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
	sources: {
		satellite: {
			type: "raster",
			tiles: [
				`https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/512/{z}/{x}/{y}@2x?access_token=${ACCESS_TOKEN}`,
			],
			tileSize: 512,
			maxzoom: 22,
			attribution: "© Mapbox © OpenStreetMap © Maxar",
		},
	},
	layers: [{ id: "satellite", type: "raster", source: "satellite" }],
};

/**
 * A drawn map, from current map data instead of photos, so new buildings show up there even when the satellite
 * imagery is older than them. Follows the app's light or dark theme.
 */
const DRAWN_STYLES = {
	light: "mapbox://styles/mapbox/light-v11",
	dark: "mapbox://styles/mapbox/dark-v11",
} as const;

const mapTypes = ["satellite", "drawn"] as const;
type MapType = (typeof mapTypes)[number];

/** Remember each viewer's choices of map type and 3D, in their own browser */
const MAP_TYPE_STORAGE_KEY = "yard-map-type";
const IS_3D_STORAGE_KEY = "yard-map-3d";

function readStored<T extends string>(key: string, values: ReadonlyArray<T>, fallback: T): T {
	try {
		const stored = localStorage.getItem(key);
		return values.find((value) => value === stored) ?? fallback;
	} catch {
		return fallback;
	}
}

function store(key: string, value: string) {
	try {
		localStorage.setItem(key, value);
	} catch {
		// Not remembered, for example in a private window
	}
}

/** How far the map tilts in 3D, in degrees from looking straight down */
const PITCH_3D = 60;
/** Turned a little in 3D, so the buildings' sides show */
const BEARING_3D = -20;
/** How long the buildings take to grow to their height when 3D is turned on */
const GROW_DURATION = 900;

/**
 * How far the buildings have grown, from 0 (flat) to 1 (full height). Grows from the ground each time 3D is turned
 * on, which makes it clear the heights are the buildings' own.
 */
function useGrowth(is3d: boolean) {
	const [growth, setGrowth] = useState(0);

	useEffect(() => {
		if (!is3d) {
			setGrowth(0);
			return;
		}

		let frame = 0;
		const start = performance.now();
		const grow = (now: number) => {
			const progress = Math.min(1, (now - start) / GROW_DURATION);
			// Eases out, so the buildings slow down as they reach their height
			setGrowth(1 - (1 - progress) ** 3);
			if (progress < 1) frame = requestAnimationFrame(grow);
		};
		frame = requestAnimationFrame(grow);

		return () => cancelAnimationFrame(frame);
	}, [is3d]);

	return growth;
}

/** Shades walls and corners and darkens the ground around the buildings a little, so the blocks look solid */
const AMBIENT_OCCLUSION = {
	"fill-extrusion-ambient-occlusion-intensity": 0.4,
	"fill-extrusion-ambient-occlusion-wall-radius": 4,
	"fill-extrusion-ambient-occlusion-ground-radius": 6,
	"fill-extrusion-ambient-occlusion-ground-attenuation": 0.7,
} as const;

/** The color of the yard's other buildings in 3D, so they're there without drawing attention */
function getSurroundingsColor(mapType: MapType, isDarkTheme: boolean) {
	if (mapType === "satellite") return "#d4d4d8";
	return isDarkTheme ? "#52525b" : "#e4e4e7";
}

function useIsDarkTheme() {
	const { theme } = useTheme();
	return theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
}

/**
 * Counts the theme switches, so colors read from the theme's CSS variables can be read again. The theme provider
 * switches the `light`/`dark` class on `<html>` in an effect that runs after this component has rendered, so a new
 * theme can't be read while rendering. This changes once the class has actually switched.
 */
function useThemeSwitchCount() {
	const [count, setCount] = useState(0);

	useEffect(() => {
		const observer = new MutationObserver(() => setCount((previous) => previous + 1));
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
		return () => observer.disconnect();
	}, []);

	return count;
}

/** The selected building's outline, in the app's accent color, so it's clear which one is selected */
const SELECTED_OUTLINE_COLOR = "var(--primary)";
const WHITE = "rgba(255, 255, 255, 1)";
const GREY = "rgba(113, 113, 122, 1)";
/** How far the selected building's color is brightened towards white */
const SELECTED_BRIGHTEN = 0.3;
/** How far the other buildings' colors fade towards grey while one is selected */
const DIMMED_FADE = 0.6;

/**
 * Whether the map is enlarged to fill most of the window, over a dimmed page. Escape makes it normal size again, and
 * the page behind it doesn't scroll meanwhile.
 */
function useEnlarged() {
	const [isEnlarged, setIsEnlarged] = useState(false);

	useEffect(() => {
		if (!isEnlarged) return;

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setIsEnlarged(false);
		};
		const { overflow } = document.body.style;
		document.body.style.overflow = "hidden";
		window.addEventListener("keydown", onKeyDown);

		return () => {
			document.body.style.overflow = overflow;
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [isEnlarged]);

	return [isEnlarged, setIsEnlarged] as const;
}

/** The details card's width, `w-72`, in pixels */
const DETAILS_CARD_WIDTH = 288;
/** Narrower maps zoom to the building without leaving room for the card, which then covers part of the map */
const DETAILS_MIN_MAP_WIDTH = 640;

/** Mapbox's own source and layer ids, not DOM ids, so they can be the same for every map on the page */
const SOURCE_ID = "yard-buildings";
const SURROUNDINGS_SOURCE_ID = "yard-surroundings";
const SURROUNDINGS_LAYER = "yard-surroundings-3d";
const FILL_LAYER = "yard-buildings-fill";
const EXTRUSION_LAYER = "yard-buildings-3d";
const OUTLINE_LAYER = "yard-buildings-outline";
const LABEL_LAYER = "yard-buildings-label";
/** How far around the yard the map can be panned, in degrees */
const PAN_MARGIN = 0.02;
const BUILDING_ZOOM = 18;

/** Where the camera looks from, flat or tilted for 3D */
function getCameraAngle(is3d: boolean) {
	return { pitch: is3d ? PITCH_3D : 0, bearing: is3d ? BEARING_3D : 0 };
}

/**
 * A yard on a Mapbox map that can be zoomed and panned, with its buildings drawn on top in their own colors. The
 * viewer can switch between satellite imagery and a drawn map, and turn on 3D, which raises the buildings to their
 * height, see `getBuildingHeight`, and tilts the map. Selecting a building, here or in a list next to the map, zooms
 * to it; deselecting zooms back out to the whole yard.
 */
export function YardMap({ site, buildings, selectedBuilding, onSelect, details }: YardMapProps) {
	const { t } = useTranslation();
	const mapRef = useRef<MapRef>(null);
	const [isHoveringBuilding, setIsHoveringBuilding] = useState(false);
	const [mapType, setMapType] = useState<MapType>(() => readStored(MAP_TYPE_STORAGE_KEY, mapTypes, "satellite"));
	const [isEnlarged, setIsEnlarged] = useEnlarged();
	const [is3d, setIs3d] = useState(() => readStored(IS_3D_STORAGE_KEY, ["on", "off"], "off") === "on");
	const isDarkTheme = useIsDarkTheme();
	const themeSwitchCount = useThemeSwitchCount();
	const growth = useGrowth(is3d);
	const surroundings = siteMaps[site]?.surroundings;
	// Dark labels on the light drawn map, white ones on the satellite imagery and the dark drawn map
	const hasDarkLabels = mapType === "drawn" && !isDarkTheme;

	const yardBounds = useMemo(() => {
		const outlines = Object.values(siteMaps[site]?.buildings ?? {}).flatMap((building) =>
			building ? getOutlines(building) : [],
		);
		return getBounds(outlines.length > 0 ? outlines : buildings.flatMap((building) => building.outlines));
	}, [site, buildings]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: `themeSwitchCount` isn't read, but `toMapColor` reads the theme's colors, so they're read again after each theme switch
	const data = useMemo<GeoJSON.FeatureCollection<GeoJSON.MultiPolygon>>(() => {
		const highlight = toMapColor(SELECTED_OUTLINE_COLOR);

		return {
			type: "FeatureCollection",
			features: buildings.map((building) => {
				const isSelected = building.id === selectedBuilding;
				// While a building is selected, the others fade, so it stands out. It keeps its own color, brightened.
				const isDimmed = selectedBuilding !== null && !isSelected;
				const color = toMapColor(building.color);
				const shownColor = isSelected
					? mixMapColors(color, WHITE, SELECTED_BRIGHTEN)
					: isDimmed
						? mixMapColors(color, GREY, DIMMED_FADE)
						: color;

				return {
					type: "Feature",
					properties: {
						id: building.id,
						label: building.label,
						color: shownColor,
						outlineColor: isSelected ? highlight : shownColor,
						height: getBuildingHeight(site, building.id),
						selected: isSelected,
						dimmed: isDimmed,
					},
					geometry: { type: "MultiPolygon", coordinates: building.outlines.map((outline) => [outline]) },
				};
			}),
		};
	}, [site, buildings, selectedBuilding, themeSwitchCount]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: Only zoom when the selection changes, not when the buildings' data does
	useEffect(() => {
		const outlines = buildings.find((building) => building.id === selectedBuilding)?.outlines;
		// Room for the details card on the left, when the map is wide enough to leave the building visible beside it
		const width = mapRef.current?.getContainer().clientWidth ?? 0;
		const left = outlines && details && width >= DETAILS_MIN_MAP_WIDTH ? DETAILS_CARD_WIDTH + 40 : 60;
		mapRef.current?.fitBounds(outlines ? getBounds(outlines) : yardBounds, {
			...getCameraAngle(is3d),
			padding: { top: 60, right: 60, bottom: 60, left },
			maxZoom: BUILDING_ZOOM,
			duration: 800,
		});
	}, [selectedBuilding]);

	useEffect(() => {
		mapRef.current?.easeTo({ ...getCameraAngle(is3d), duration: 800 });
	}, [is3d]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: Mapbox doesn't notice its container changing size, so it's told after each change
	useEffect(() => {
		const frame = requestAnimationFrame(() => mapRef.current?.resize());
		return () => cancelAnimationFrame(frame);
	}, [isEnlarged]);

	const [[west, south], [east, north]] = yardBounds;

	const onClick = (event: MapMouseEvent) => {
		const id = event.features?.[0]?.properties?.id;
		onSelect(typeof id === "string" && id !== selectedBuilding ? id : null);
	};

	return (
		<>
			{isEnlarged && (
				// Clicking beside the enlarged map makes it normal size again
				<button
					type="button"
					aria-label={t(($) => $.aggregatedExposure.map.exitFullscreen)}
					className="fixed inset-0 z-40 cursor-default bg-black/60"
					onClick={() => setIsEnlarged(false)}
				/>
			)}
			{/* `isolate` keeps the map's controls below the app's overlays, such as dialogs and the sidebar */}
			<div
				className={cn(
					"isolate min-w-0 overflow-hidden rounded-md border bg-background",
					isEnlarged ? "fixed inset-3 z-50 shadow-2xl sm:inset-8" : "relative h-96 sm:h-[30rem] lg:h-[36rem]",
				)}
			>
				<div className="absolute top-2.5 left-2.5 z-10 flex gap-2">
					<ToggleGroup
						type="single"
						variant="outline"
						size="sm"
						value={mapType}
						aria-label={t(($) => $.aggregatedExposure.map.mapType)}
						className="bg-background/90 shadow-md"
						onValueChange={(value) => {
							const selected = mapTypes.find((type) => type === value);
							if (selected) {
								setMapType(selected);
								store(MAP_TYPE_STORAGE_KEY, selected);
							}
						}}
					>
						<ToggleGroupItem value="satellite">
							{t(($) => $.aggregatedExposure.map.satellite)}
						</ToggleGroupItem>
						<ToggleGroupItem value="drawn">{t(($) => $.aggregatedExposure.map.drawnMap)}</ToggleGroupItem>
					</ToggleGroup>
					<Toggle
						variant="outline"
						size="sm"
						pressed={is3d}
						aria-label={t(($) => $.aggregatedExposure.map.view3d)}
						className="bg-background/90 shadow-md"
						onPressedChange={(pressed) => {
							setIs3d(pressed);
							store(IS_3D_STORAGE_KEY, pressed ? "on" : "off");
						}}
					>
						{t(($) => $.aggregatedExposure.map.label3d)}
					</Toggle>
					<Toggle
						variant="outline"
						size="sm"
						pressed={isEnlarged}
						aria-label={t(($) =>
							isEnlarged
								? $.aggregatedExposure.map.exitFullscreen
								: $.aggregatedExposure.map.enterFullscreen,
						)}
						title={t(($) =>
							isEnlarged
								? $.aggregatedExposure.map.exitFullscreen
								: $.aggregatedExposure.map.enterFullscreen,
						)}
						className="bg-background/90 shadow-md"
						onPressedChange={setIsEnlarged}
					>
						{isEnlarged ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}
					</Toggle>
				</div>

				{details && (
					// Under the switches, so they stay reachable, and scrolling when it's taller than the map
					<div className="absolute top-14 left-2.5 z-10 max-h-[calc(100%-5.5rem)] w-72 max-w-[calc(100%-1.25rem)] overflow-y-auto rounded-md border bg-background/95 p-4 shadow-lg">
						<button
							type="button"
							aria-label={t(($) => $.aggregatedExposure.map.closeDetails)}
							title={t(($) => $.aggregatedExposure.map.closeDetails)}
							className="float-right -mt-1 -mr-1 rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
							onClick={() => onSelect(null)}
						>
							<X aria-hidden="true" className="size-4" />
						</button>
						{details}
					</div>
				)}

				<MapboxMap
					key={site}
					ref={mapRef}
					mapboxAccessToken={ACCESS_TOKEN}
					mapStyle={mapType === "satellite" ? SATELLITE_STYLE : DRAWN_STYLES[isDarkTheme ? "dark" : "light"]}
					initialViewState={{
						bounds: yardBounds,
						fitBoundsOptions: { padding: 40, ...getCameraAngle(is3d) },
					}}
					maxBounds={[
						[west - PAN_MARGIN, south - PAN_MARGIN],
						[east + PAN_MARGIN, north + PAN_MARGIN],
					]}
					interactiveLayerIds={[is3d ? EXTRUSION_LAYER : FILL_LAYER]}
					onClick={onClick}
					onMouseEnter={() => setIsHoveringBuilding(true)}
					onMouseLeave={() => setIsHoveringBuilding(false)}
					cursor={isHoveringBuilding ? "pointer" : "grab"}
					customAttribution="Building outlines © OpenStreetMap contributors · Building heights © Kartverket"
					style={{ width: "100%", height: "100%" }}
					// The map's own buttons' tooltips, in the app's language
					locale={{
						"NavigationControl.ZoomIn": t(($) => $.aggregatedExposure.map.zoomIn),
						"NavigationControl.ZoomOut": t(($) => $.aggregatedExposure.map.zoomOut),
						"NavigationControl.ResetBearing": t(($) => $.aggregatedExposure.map.resetBearing),
					}}
				>
					<NavigationControl position="top-right" />
					<ScaleControl position="bottom-left" />

					{/* Added before the yard's own buildings, so it's drawn below them */}
					{is3d && surroundings && (
						<Source id={SURROUNDINGS_SOURCE_ID} type="geojson" data={surroundings}>
							<Layer
								id={SURROUNDINGS_LAYER}
								type="fill-extrusion"
								paint={{
									"fill-extrusion-color": getSurroundingsColor(mapType, isDarkTheme),
									"fill-extrusion-height": ["*", ["get", "height"], growth],
									"fill-extrusion-base": 0,
									"fill-extrusion-opacity": 0.9,
									...AMBIENT_OCCLUSION,
								}}
							/>
						</Source>
					)}

					<Source id={SOURCE_ID} type="geojson" data={data}>
						{is3d ? (
							<Layer
								// Separate keys, so switching 3D swaps the layer instead of reusing it with another type
								key={EXTRUSION_LAYER}
								id={EXTRUSION_LAYER}
								type="fill-extrusion"
								paint={{
									"fill-extrusion-color": ["get", "color"],
									"fill-extrusion-height": ["*", ["get", "height"], growth],
									"fill-extrusion-base": 0,
									"fill-extrusion-opacity": 0.9,
									...AMBIENT_OCCLUSION,
								}}
							/>
						) : (
							<Layer
								key={FILL_LAYER}
								id={FILL_LAYER}
								type="fill"
								paint={{
									"fill-color": ["get", "color"],
									"fill-opacity": ["case", ["get", "selected"], 0.55, ["get", "dimmed"], 0.15, 0.3],
								}}
							/>
						)}
						<Layer
							id={OUTLINE_LAYER}
							type="line"
							paint={{
								"line-color": ["get", "outlineColor"],
								"line-width": ["case", ["get", "selected"], 4, ["get", "dimmed"], 1.5, 2],
							}}
						/>
						<Layer
							id={LABEL_LAYER}
							type="symbol"
							minzoom={15}
							layout={{
								"text-field": ["get", "label"],
								"text-size": 12,
								"text-anchor": "top",
								"text-offset": [0, 1.4],
								"text-max-width": 10,
							}}
							paint={{
								"text-color": hasDarkLabels ? "#1f2937" : "#ffffff",
								"text-halo-color": hasDarkLabels ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.85)",
								"text-halo-width": 1.5,
							}}
						/>
					</Source>

					{buildings.map((building) => {
						if (building.badge === undefined) {
							return null;
						}

						const [longitude, latitude] = getCenter(building.outlines);

						return (
							<Marker
								key={building.id}
								longitude={longitude}
								latitude={latitude}
								onClick={(event) => {
									event.originalEvent.stopPropagation();
									onSelect(building.id);
								}}
							>
								<button type="button" aria-label={building.label} className="cursor-pointer">
									{building.badge}
								</button>
							</Marker>
						);
					})}
				</MapboxMap>
			</div>
		</>
	);
}
