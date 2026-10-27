import { OptionToggle } from "@/features/aggregated-exposure/components/option-toggle.tsx";
import type { GroupLevel } from "@/features/aggregated-exposure/model/groups.ts";
import { Factory, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";

export function GroupLevelToggle({
	value,
	onValueChange,
}: {
	value: GroupLevel;
	onValueChange: (level: GroupLevel) => void;
}) {
	const { t } = useTranslation();

	return (
		<OptionToggle<GroupLevel>
			label={t(($) => $.aggregatedExposure.overview.level.label)}
			value={value}
			onValueChange={onValueChange}
			options={[
				{
					value: "hall",
					label: t(($) => $.aggregatedExposure.overview.level.hall),
					icon: <Factory aria-hidden="true" className="size-4" />,
				},
				{
					value: "occupation",
					label: t(($) => $.aggregatedExposure.overview.level.occupation),
					icon: <UsersRound aria-hidden="true" className="size-4" />,
				},
			]}
		/>
	);
}
