import { Card, CardContent } from "@/components/ui/card.tsx";
import { useDashboardScope } from "@/features/aggregated-exposure/hooks/use-dashboard-scope.ts";
import {
	compareAverages,
	formatGroupValue,
	getGroupThreshold,
	getMetricLabel,
	getOccupationLabel,
	NO_VALUE,
} from "@/features/aggregated-exposure/model/groups.ts";
import {
	type Building,
	getBuildings,
	type toSiteMapSummaries,
} from "@/features/aggregated-exposure/model/site-maps.ts";
import { getOutlines, siteMaps } from "@/features/location-map/site-map-config.ts";
import { YardMap, type YardMapBuilding } from "@/features/location-map/yard-map.tsx";
import type { TranslateFn } from "@/i18n/config.ts";
import { dangerlevelStyles, getDangerLevel } from "@/lib/danger-levels.ts";
import type { DustField, Exposure, ExposureUnit } from "@/lib/exposures.ts";
import { Building2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

/** Shown for a building without a head count */
const UNAVAILABLE_COUNT = "–";

function CountBadge({ label, selected }: { label: string | number; selected: boolean }) {
	return (
		<div
			className="flex h-9 min-w-9 items-center justify-center rounded-full border-2 px-2 font-semibold text-sm shadow-md"
			style={{
				color: selected ? "var(--primary)" : "var(--foreground)",
				background: selected ? "var(--primary-foreground)" : "var(--background)",
				borderColor: "var(--primary)",
			}}
		>
			{label}
		</div>
	);
}

type SiteMapProps = {
	site: string;
	summaries: ReturnType<typeof toSiteMapSummaries>;
	exposure: Exposure;
	/** The dust fraction the summaries were requested for */
	dustField: DustField;
};

/**
 * The site's buildings and the occupation groups in each, from the aggregate API's groups, with their average of the
 * selected exposure. Buildings are sorted by that average, highest first, and drawn on the site's map, when it has
 * one, in the color of where the average falls between the action and limit values. The head counts are the operators
 * the whole building's averages are from, see `Building.peopleCount`. Meant to be rendered with the site as its `key`,
 * so the selected building doesn't carry over to another site.
 */
export function SiteMap({ site, summaries, exposure, dustField }: SiteMapProps) {
	const { t } = useTranslation();
	const scope = useDashboardScope();
	const siteMap = siteMaps[site];
	const [selectedHall, setSelectedHall] = useState<string | null>(null);

	const { units, groups, halls } = summaries;
	const unit = units[exposure];
	const threshold = getGroupThreshold(exposure, dustField);
	const buildings = useMemo(
		() =>
			getBuildings(groups, halls, site).toSorted((a, b) =>
				compareAverages(a.averages?.[exposure] ?? null, b.averages?.[exposure] ?? null),
			),
		[groups, halls, site, exposure],
	);
	const getOccupationAverage = (hall: string, occupation: string) =>
		groups.find((group) => group.site === site && group.hall === hall && group.occupation === occupation)?.averages[
			exposure
		] ?? null;
	const selectedBuilding = buildings.find((building) => building.hall === selectedHall) ?? null;
	// Colored by where the building's average falls between the action and limit values
	const mapBuildings = buildings.flatMap((building): Array<YardMapBuilding> => {
		const siteMapBuilding = siteMap?.buildings[building.hall];
		if (!siteMapBuilding) return [];

		const average = building.averages?.[exposure] ?? null;
		const dangerLevel = average === null ? "none" : getDangerLevel(average, threshold.warning, threshold.danger);

		return [
			{
				id: building.hall,
				label: building.label,
				outlines: getOutlines(siteMapBuilding),
				color: dangerlevelStyles[dangerLevel].color,
				// Only buildings with groups get a count, so a yard full of buildings without data stays readable
				badge:
					building.occupations.length > 0 ? (
						<CountBadge
							label={building.peopleCount ?? UNAVAILABLE_COUNT}
							selected={selectedHall === building.hall}
						/>
					) : undefined,
			},
		];
	});

	const detailsProps = { exposure, dustField, unit, getOccupationAverage };

	return (
		<Card className="overflow-hidden rounded-lg">
			<CardContent className="gap-4 p-3 sm:p-4">
				<div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
					<aside className="flex flex-col gap-2">
						<p className="px-2 font-medium text-sm">{t(($) => $.aggregatedExposure.map.buildings)}</p>
						{buildings.map((building) => {
							const active = selectedHall === building.hall;
							const onMap = siteMap?.buildings[building.hall] !== undefined;
							return (
								<button
									key={building.hall}
									type="button"
									aria-pressed={active}
									onClick={() => setSelectedHall(active ? null : building.hall)}
									className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${active ? "border-primary bg-accent" : "border-transparent hover:bg-muted"}`}
								>
									<Building2 aria-hidden="true" className="size-4 shrink-0 text-primary" />
									<span className="min-w-0 flex-1 truncate font-medium">{building.label}</span>
									{siteMap && !onMap && (
										<span className="text-muted-foreground text-xs">
											{t(($) => $.aggregatedExposure.map.notOnMap)}
										</span>
									)}
									{building.peopleCount === null ? (
										<span
											className="inline-flex items-center gap-1.5 text-muted-foreground text-sm tabular-nums"
											title={t(($) => $.aggregatedExposure.map.peopleCountUnavailable)}
										>
											<Users aria-hidden="true" className="size-4" />
											<span aria-hidden="true">{UNAVAILABLE_COUNT}</span>
											<span className="sr-only">
												{t(($) => $.aggregatedExposure.map.peopleCountUnavailable)}
											</span>
										</span>
									) : (
										<span className="inline-flex items-center gap-1.5 text-muted-foreground text-sm tabular-nums">
											<Users aria-hidden="true" className="size-4" />
											{building.peopleCount}
										</span>
									)}
									<span className="text-sm tabular-nums">
										{formatAverage(building.averages?.[exposure] ?? null, unit, t)}
									</span>
								</button>
							);
						})}
						{selectedBuilding && !siteMap ? (
							// Without a map, the details go under the list, since there's no map to show them on
							<div className="mt-2 border-t px-2 pt-4">
								<BuildingDetails {...detailsProps} building={selectedBuilding} />
							</div>
						) : (
							!selectedBuilding &&
							scope.showsGuidance && (
								<p className="mt-2 border-t px-2 pt-4 text-muted-foreground text-sm">
									{t(($) => $.aggregatedExposure.map.selectBuilding)}
								</p>
							)
						)}
					</aside>

					{siteMap ? (
						<YardMap
							site={site}
							buildings={mapBuildings}
							selectedBuilding={selectedHall}
							onSelect={setSelectedHall}
							details={
								selectedBuilding && <BuildingDetails {...detailsProps} building={selectedBuilding} />
							}
						/>
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

type BuildingDetailsProps = {
	building: Building;
	exposure: Exposure;
	dustField: DustField;
	unit: ExposureUnit;
	getOccupationAverage: (hall: string, occupation: string) => number | null;
};

/** The selected building's head count, average and occupation groups */
function BuildingDetails({ building, exposure, dustField, unit, getOccupationAverage }: BuildingDetailsProps) {
	const { t } = useTranslation();

	return (
		<>
			<p className="text-muted-foreground text-xs">{t(($) => $.aggregatedExposure.map.selectedBuilding)}</p>
			<h2 className="mt-1 font-semibold">{building.label}</h2>
			<p
				className={`mt-3 flex items-center gap-2 font-medium text-sm ${building.peopleCount === null ? "text-muted-foreground" : ""}`}
			>
				<Users aria-hidden="true" className="size-4 shrink-0 text-primary" />
				{building.peopleCount === null
					? t(($) => $.aggregatedExposure.map.peopleCountUnavailable)
					: t(($) => $.aggregatedExposure.map.peopleWorkingHere, { count: building.peopleCount })}
			</p>
			<p className="mt-3 flex items-center justify-between gap-3 border-t pt-3 text-sm">
				<span className="text-muted-foreground">{getMetricLabel(exposure, dustField, t)}</span>
				<span className="shrink-0 font-medium tabular-nums">
					{formatAverage(building.averages?.[exposure] ?? null, unit, t)}
				</span>
			</p>
			<div className="mt-4">
				<p className="font-medium text-sm">{t(($) => $.aggregatedExposure.map.occupations)}</p>
				{building.occupations.length === 0 && (
					<p className="mt-2 text-muted-foreground text-sm">
						{t(($) => $.aggregatedExposure.map.noOccupations)}
					</p>
				)}
				<ul className="mt-2 flex flex-col divide-y">
					{building.occupations.map((occupation) => (
						<li key={occupation} className="flex items-center justify-between gap-3 py-2 text-sm">
							<span className="min-w-0">{getOccupationLabel(occupation, t)}</span>
							<span className="shrink-0 font-medium tabular-nums">
								{formatAverage(getOccupationAverage(building.hall, occupation), unit, t)}
							</span>
						</li>
					))}
				</ul>
			</div>
		</>
	);
}

function formatAverage(average: number | null, unit: ExposureUnit, t: TranslateFn) {
	return average === null ? NO_VALUE : formatGroupValue(average, unit, t);
}
