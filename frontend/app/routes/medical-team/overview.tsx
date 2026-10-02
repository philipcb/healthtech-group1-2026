import { useTranslation } from "react-i18next";

export default function MedicalTeamOverview() {
	const { t } = useTranslation();

	return (
		<div className="flex w-full flex-col gap-4">
			<h1 className="font-bold text-2xl">{t(($) => $.medicalTeamDashboard.title)}</h1>
		</div>
	);
}
