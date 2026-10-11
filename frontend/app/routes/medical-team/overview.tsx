import { GroupFilters } from "@/features/medical-team/group-filters.tsx";
import { GroupList } from "@/features/medical-team/group-list.tsx";
import { MedicalPeriodPicker } from "@/features/medical-team/medical-period-picker.tsx";
import { getPrivacySafeGroups, MIN_GROUP_SIZE, useGroupFilters } from "@/features/medical-team/medical-team-groups.ts";
import { medicalGroupAggregates } from "@/features/medical-team/medical-team-mock-data.ts";
import { getPeriodLabel, usePeriodSelection } from "@/features/medical-team/medical-team-period.ts";
import { useUser } from "@/features/user/user-context.tsx";
import { CalendarDays, MapPin, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function MedicalTeamOverview() {
	const { t } = useTranslation();
	const { user } = useUser();
	const periodSelection = usePeriodSelection();
	const groups = getPrivacySafeGroups(medicalGroupAggregates, user.location.site, periodSelection.period);
	const { hall, setHall, occupation, setOccupation, halls, occupations, visibleGroups } = useGroupFilters(groups);

	return (
		<div className="flex w-full min-w-0 flex-col gap-7">
			<header className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between">
				<div className="space-y-2">
					<p className="flex items-center gap-2 text-muted-foreground text-sm">
						<MapPin aria-hidden="true" className="size-4" />
						{user.location.site}
					</p>
					<h1 className="font-medium text-2xl">{t(($) => $.medicalTeamDashboard.title)}</h1>
					<p className="max-w-prose text-muted-foreground text-sm">
						{t(($) => $.medicalTeamDashboard.description)}
					</p>
				</div>
				<MedicalPeriodPicker selection={periodSelection} />
			</header>

			<GroupFilters
				halls={halls}
				occupations={occupations}
				hall={hall}
				occupation={occupation}
				onHallChange={setHall}
				onOccupationChange={setOccupation}
			/>

			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex items-center gap-2 text-muted-foreground text-sm">
					<CalendarDays aria-hidden="true" className="size-4" />
					<span>{getPeriodLabel(periodSelection, t)}</span>
				</div>
				<p className="flex items-center gap-1.5 text-muted-foreground text-xs">
					<ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
					{t(($) => $.medicalTeamDashboard.privacyNotice, { count: MIN_GROUP_SIZE })}
				</p>
			</div>

			<GroupList groups={visibleGroups} period={periodSelection.period} />

			<p className="flex items-start gap-2 border-t pt-4 text-muted-foreground text-xs">
				<ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
				{t(($) => $.medicalTeamDashboard.demoDataNotice)}
			</p>
		</div>
	);
}
