import { SummaryCard } from "@/features/aggregated-exposure/components/summary-card.tsx";
import {
	type ComparableGroup,
	getComparableGroupName,
	isPerOccupation,
} from "@/features/aggregated-exposure/model/compare.ts";
import {
	compareByExposureFilter,
	type ExposureFilter,
	getOccupationLabel,
	getShownExposures,
} from "@/features/aggregated-exposure/model/groups.ts";
import type { TranslateFn } from "@/i18n/config.ts";
import type { MeasurementUnitsDto } from "@/lib/api/generated/models/index.ts";
import { Factory, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";

type GroupListProps = {
	groups: Array<ComparableGroup>;
	units: MeasurementUnitsDto;
	filter: ExposureFilter;
	showsYard: boolean;
};

export function GroupList({ groups, units, filter, showsYard }: GroupListProps) {
	const { t } = useTranslation();
	const sortedGroups = groups.toSorted((a, b) => compareGroups(a, b, filter));

	return (
		<ul className="grid grid-cols-1 gap-4 xl:grid-cols-2">
			{sortedGroups.map((group) => (
				<li key={group.groupId}>
					<SummaryCard
						header={<GroupHeader group={group} showsYard={showsYard} />}
						groupId={group.groupId}
						name={getComparableGroupName(group, t)}
						averages={group.averages}
						units={units}
						shownExposures={getShownExposures(filter)}
					/>
				</li>
			))}
		</ul>
	);
}

function GroupHeader({ group, showsYard }: { group: ComparableGroup; showsYard: boolean }) {
	const { t } = useTranslation();
	const Icon = group.hall === null ? MapPin : Factory;
	const place = getPlace(group, showsYard, t);

	// An occupation is named under its place, a whole place is named itself
	return isPerOccupation(group.level) ? (
		<>
			<p className="flex items-center gap-2 text-muted-foreground text-xs">
				<Icon aria-hidden="true" className="size-3.5" />
				{place}
			</p>
			<h3 className="mt-1 font-semibold">{getOccupationLabel(group.occupation ?? "", t)}</h3>
		</>
	) : (
		<>
			<h3 className="flex items-center gap-2 font-semibold">
				<Icon aria-hidden="true" className="size-4 text-muted-foreground" />
				{group.hall ?? group.site}
			</h3>
			<p className="mt-1 text-muted-foreground text-xs">{place}</p>
		</>
	);
}

function getPlace(group: ComparableGroup, showsYard: boolean, t: TranslateFn) {
	switch (group.level) {
		case "yard":
			return t(($) => $.aggregatedExposure.compare.wholeYard);
		case "hall":
			return showsYard
				? `${group.site} · ${t(($) => $.aggregatedExposure.wholeHall)}`
				: t(($) => $.aggregatedExposure.wholeHall);
		case "yardOccupation":
			return `${group.site} · ${t(($) => $.aggregatedExposure.filters.allHalls)}`;
		case "hallOccupation":
			return showsYard ? `${group.site} · ${group.hall}` : (group.hall ?? group.site);
	}
}

function compareGroups(a: ComparableGroup, b: ComparableGroup, filter: ExposureFilter) {
	return (
		compareByExposureFilter(a.averages, b.averages, filter) ||
		a.site.localeCompare(b.site) ||
		(a.hall ?? "").localeCompare(b.hall ?? "") ||
		(a.occupation ?? "").localeCompare(b.occupation ?? "")
	);
}
