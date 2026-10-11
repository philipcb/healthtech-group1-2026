import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { ALL_FILTER_VALUE, getHallLabel, getOccupationLabel } from "@/features/medical-team/medical-team-groups.ts";
import { BriefcaseBusiness, Factory, type LucideIcon } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";

type GroupFiltersProps = {
	halls: Array<string>;
	occupations: Array<string>;
	hall: string;
	occupation: string;
	onHallChange: (hall: string) => void;
	onOccupationChange: (occupation: string) => void;
};

export function GroupFilters({
	halls,
	occupations,
	hall,
	occupation,
	onHallChange,
	onOccupationChange,
}: GroupFiltersProps) {
	const { t } = useTranslation();

	return (
		<section aria-label={t(($) => $.medicalTeamDashboard.filters.title)} className="grid gap-3 sm:grid-cols-2">
			<FilterSelect
				icon={Factory}
				label={t(($) => $.medicalTeamDashboard.filters.hall)}
				allLabel={t(($) => $.medicalTeamDashboard.filters.allHalls)}
				value={hall}
				options={halls}
				getOptionLabel={(option) => getHallLabel(option, t)}
				onValueChange={onHallChange}
			/>
			<FilterSelect
				icon={BriefcaseBusiness}
				label={t(($) => $.medicalTeamDashboard.filters.occupation)}
				allLabel={t(($) => $.medicalTeamDashboard.filters.allOccupations)}
				value={occupation}
				options={occupations}
				getOptionLabel={(option) => getOccupationLabel(option, t)}
				onValueChange={onOccupationChange}
			/>
		</section>
	);
}

function FilterSelect({
	icon: Icon,
	label,
	allLabel,
	value,
	options,
	getOptionLabel,
	onValueChange,
}: {
	icon: LucideIcon;
	label: string;
	/** Label for the option that matches every value */
	allLabel: string;
	value: string;
	options: Array<string>;
	getOptionLabel: (option: string) => string;
	onValueChange: (value: string) => void;
}) {
	const id = useId();

	return (
		<div className="space-y-1.5">
			<label className="flex items-center gap-2 font-medium text-sm" htmlFor={id}>
				<Icon aria-hidden="true" className="size-4 text-muted-foreground" />
				{label}
			</label>
			<Select value={value} onValueChange={onValueChange}>
				<SelectTrigger id={id} className="w-full bg-background">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={ALL_FILTER_VALUE}>{allLabel}</SelectItem>
					{options.map((option) => (
						<SelectItem key={option} value={option}>
							{getOptionLabel(option)}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
