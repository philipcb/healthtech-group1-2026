import { useAggregatedExposureSearchParams } from "@/features/aggregated-exposure/hooks/use-aggregated-exposure-search-params.ts";
import { useDashboardScope } from "@/features/aggregated-exposure/hooks/use-dashboard-scope.ts";
import {
	type ComparedEntry,
	type ComparedGroup,
	type CompareLevel,
	compareLevels,
	moveToLevel,
	toComparableGroups,
} from "@/features/aggregated-exposure/model/compare.ts";
import { toPeriodParams } from "@/features/aggregated-exposure/model/period.ts";
import { getYards } from "@/features/aggregated-exposure/model/scope.ts";
import { getFreeSlot } from "@/features/aggregated-exposure/model/series.ts";
import { useGetAggregateGroups } from "@/lib/api/generated/aggregate-exposure-data.ts";
import { createParser, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const parseAsComparedGroups = createParser<Array<ComparedGroup>>({
	parse: (value) => {
		const compared: Array<ComparedGroup> = [];
		for (const entry of value.split(",")) {
			const [slotText, groupId] = entry.split(".");
			const slot = slotText !== undefined && /^\d+$/.test(slotText) ? Number(slotText) : undefined;
			const isNew = !compared.some((group) => group.slot === slot || group.groupId === groupId);
			if (slot !== undefined && groupId && isNew) {
				compared.push({ groupId, slot });
			}
		}
		return compared;
	},
	serialize: (compared) => compared.map(({ slot, groupId }) => `${slot}.${groupId}`).join(","),
	eq: (a, b) =>
		a.length === b.length &&
		a.every((group, index) => group.groupId === b[index]?.groupId && group.slot === b[index]?.slot),
});

const searchParams = {
	compareLevel: parseAsStringLiteral(compareLevels).withDefault("hall"),
	groups: parseAsComparedGroups.withDefault([]),
};

export function useComparison() {
	const { t } = useTranslation();
	const { YardFilter } = useDashboardScope();
	const { yard, setYard, periodSelection } = useAggregatedExposureSearchParams();
	// Not shallow, like `useAggregatedExposureSearchParams`, so links built from the location keep the selection
	const [params, setParams] = useQueryStates(searchParams, { shallow: false });
	const [cleared, setCleared] = useState<Array<ComparedGroup>>();
	const level = params.compareLevel;

	const groupsQuery = useGetAggregateGroups(toPeriodParams(periodSelection), {
		query: { select: toComparableGroups },
	});
	const groups = groupsQuery.data?.groups ?? [];
	const groupsAtLevel = groups.filter((group) => group.level === level);
	const yards = getYards(groups);
	const selectedYard = YardFilter && yard !== null && yards.includes(yard) ? yard : null;
	const entries: Array<ComparedEntry> = params.groups.flatMap(({ groupId, slot }) => {
		const group = groupsAtLevel.find((candidate) => candidate.groupId === groupId);
		return group ? [{ group, slot }] : [];
	});
	const compared = entries.map(({ group, slot }) => ({ groupId: group.groupId, slot }));
	const isLoaded = !(groupsQuery.isPending || groupsQuery.isError);

	const setCompared = (next: Array<ComparedGroup>) => {
		void setParams({ groups: next.length === 0 ? null : next });
		setCleared(undefined);
	};

	return {
		status: groupsQuery.isPending ? "pending" : groupsQuery.isError ? "error" : "ok",
		hiddenFromLink: isLoaded ? params.groups.length - entries.length : 0,
		retry: () => void groupsQuery.refetch(),
		units: groupsQuery.data?.units,
		level,
		entries,
		options: groupsAtLevel.filter((group) => selectedYard === null || group.site === selectedYard),
		yards,
		selectedYard,
		setYard,
		lastChange: cleared && {
			message: t(($) => $.aggregatedExposure.compare.picker.cleared),
			undo: () => {
				void setParams({ groups: cleared });
				setCleared(undefined);
			},
		},
		changeLevel: (nextLevel: CompareLevel) => {
			const moved = moveToLevel(compared, level, nextLevel, groups);
			void setParams({ compareLevel: nextLevel, groups: moved.length === 0 ? null : moved }, { history: "push" });
			setCleared(undefined);
		},
		addGroups: (groupIds: Array<string>) => {
			const next = [...compared];
			for (const groupId of groupIds) {
				next.push({ groupId, slot: getFreeSlot(next) });
			}
			setCompared(next);
		},
		removeGroup: (groupId: string) => setCompared(compared.filter((group) => group.groupId !== groupId)),
		clearGroups: () => {
			void setParams({ groups: null });
			setCleared(compared);
		},
	} as const;
}
