import { getOccupationLabel, hideUnavailableAverages } from "@/features/aggregated-exposure/model/groups.ts";
import type { SeriesSlot } from "@/features/aggregated-exposure/model/series.ts";
import type { TranslateFn } from "@/i18n/config.ts";
import type { AggregatedOverviewResponseDto, SampleAveragesDto } from "@/lib/api/generated/models/index.ts";

export const compareLevels = ["yard", "hall", "yardOccupation", "hallOccupation"] as const;
export type CompareLevel = (typeof compareLevels)[number];

export const comparePlaces = ["yard", "hall"] as const;
export type ComparePlace = (typeof comparePlaces)[number];

export function getCompareLevel(place: ComparePlace, perOccupation: boolean): CompareLevel {
	if (place === "yard") {
		return perOccupation ? "yardOccupation" : "yard";
	}

	return perOccupation ? "hallOccupation" : "hall";
}

export function getComparePlace(level: CompareLevel): ComparePlace {
	return level === "yard" || level === "yardOccupation" ? "yard" : "hall";
}

export function isPerOccupation(level: CompareLevel) {
	return level === "yardOccupation" || level === "hallOccupation";
}

export type ComparableGroup = {
	groupId: string;
	level: CompareLevel;
	site: string;
	hall: string | null;
	occupation: string | null;
	averages: SampleAveragesDto;
};

export type ComparedGroup = { groupId: string; slot: SeriesSlot };

export type ComparedEntry = { group: ComparableGroup; slot: SeriesSlot };

export function toComparableGroups({ units, groups }: AggregatedOverviewResponseDto) {
	return {
		units,
		groups: groups.map(
			({ groupId, site, hall, occupation, averages }): ComparableGroup => ({
				groupId,
				level: getCompareLevel(hall === null ? "yard" : "hall", occupation !== null),
				site,
				hall,
				occupation,
				averages: hideUnavailableAverages(averages),
			}),
		),
	};
}

function getParentGroup(group: ComparableGroup, axis: "place" | "occupation", groups: Array<ComparableGroup>) {
	const hall = axis === "place" ? null : group.hall;
	const occupation = axis === "occupation" ? null : group.occupation;

	return groups.find(
		(candidate) => candidate.site === group.site && candidate.hall === hall && candidate.occupation === occupation,
	);
}

export function moveToLevel(
	compared: Array<ComparedGroup>,
	from: CompareLevel,
	to: CompareLevel,
	groups: Array<ComparableGroup>,
): Array<ComparedGroup> {
	const placeUp = getComparePlace(from) === "hall" && getComparePlace(to) === "yard";
	const occupationUp = isPerOccupation(from) && !isPerOccupation(to);
	const placeDown = getComparePlace(from) === "yard" && getComparePlace(to) === "hall";
	const occupationDown = !isPerOccupation(from) && isPerOccupation(to);

	if (placeDown || occupationDown || !(placeUp || occupationUp)) {
		return [];
	}

	const parents: Array<ComparedGroup> = [];
	for (const { groupId, slot } of compared) {
		let group = groups.find((candidate) => candidate.groupId === groupId);
		if (group && placeUp) {
			group = getParentGroup(group, "place", groups);
		}
		if (group && occupationUp) {
			group = getParentGroup(group, "occupation", groups);
		}
		if (group && !parents.some((parent) => parent.groupId === group.groupId)) {
			parents.push({ groupId: group.groupId, slot });
		}
	}

	return parents;
}

export function getComparableGroupName(group: ComparableGroup, t: TranslateFn) {
	switch (group.level) {
		case "yard":
			return group.site;
		case "hall":
			return group.hall ?? group.site;
		case "yardOccupation":
			return `${getOccupationLabel(group.occupation ?? "", t)} · ${group.site}`;
		case "hallOccupation":
			return `${getOccupationLabel(group.occupation ?? "", t)} · ${group.hall}`;
	}
}

export function getComparableGroupContext(group: ComparableGroup, t: TranslateFn) {
	switch (group.level) {
		case "yard":
			return t(($) => $.aggregatedExposure.compare.wholeYard);
		case "hall":
			return `${group.site} · ${t(($) => $.aggregatedExposure.wholeHall)}`;
		case "yardOccupation":
			return `${group.site} · ${t(($) => $.aggregatedExposure.filters.allHalls)}`;
		case "hallOccupation":
			return group.site;
	}
}

export function getComparableGroupSection(group: ComparableGroup, t: TranslateFn) {
	return isPerOccupation(group.level) ? getOccupationLabel(group.occupation ?? "", t) : group.site;
}

export function hasDetailsPage(group: ComparableGroup) {
	return group.level === "hall" || group.level === "hallOccupation";
}
