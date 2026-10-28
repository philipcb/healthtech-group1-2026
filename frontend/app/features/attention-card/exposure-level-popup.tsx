import { ExposureBadge } from "@/components/exposure-badge.tsx";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table.tsx";
import { hasInactiveSensor, hasNoActiveSensors } from "@/features/attention-card/inactive-sensors.ts";
import { BasePopup } from "@/features/popups/base-popup.tsx";
import type { UserWithStatusDto } from "@/lib/api/generated/models/index.ts";
import type { DangerLevel } from "@/lib/danger-levels.ts";
import { type Exposure, exposures } from "@/lib/exposures.ts";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export type PopupStatus = DangerLevel | "inactive";

const getExposureBadges = (worker: UserWithStatusDto, popupStatus: PopupStatus) => {
	const entries = exposures.map((exposure) => ({
		exposure,
		data: worker.status[exposure],
	}));

	return entries.filter(({ data }) => {
		if (!data) return false;

		if (popupStatus === "danger") {
			return data.dangerLevel === "danger";
		}

		if (popupStatus === "warning") {
			return data.dangerLevel === "warning" || data.dangerLevel === "danger";
		}

		return false;
	});
};

const WorkerRow = ({ worker, status }: { worker: UserWithStatusDto; status: PopupStatus }) => {
	const { t } = useTranslation();

	const exposureBadges = getExposureBadges(worker, status).map(({ exposure, data }) => (
		<ExposureBadge key={exposure} exposure={exposure} dangerLevel={data?.dangerLevel ?? "safe"}>
			{t(($) => $.exposures[exposure])}
		</ExposureBadge>
	));

	return (
		<TableRow key={worker.id}>
			<TableCell>
				<Link to={`/foreman/?userId=${worker.id}`} className="flex w-full items-center justify-between">
					<p>{worker.name}</p>
					<div className="flex gap-2">{exposureBadges}</div>
				</Link>
			</TableCell>
		</TableRow>
	);
};

export function AtRiskPopup({
	status,
	open,
	onClose,
	subordinates,
	inactiveExposure,
}: {
	title: string;
	status: PopupStatus;
	open: boolean;
	onClose: () => void;
	subordinates: Array<UserWithStatusDto>;
	/** With status "inactive": list workers inactive for this exposure, or with no active sensors if omitted */
	inactiveExposure?: Exposure;
}) {
	const { t } = useTranslation();

	const exposureTitle =
		status === "danger"
			? t((x) => x.exposureLevel.inDanger)
			: status === "warning"
				? t((x) => x.exposureLevel.warning)
				: status === "safe"
					? t((x) => x.exposureLevel.safe)
					: t((x) => x.exposureLevel.inactive);

	const workers = subordinates.filter((sub) =>
		status === "inactive"
			? inactiveExposure
				? hasInactiveSensor(sub, inactiveExposure)
				: hasNoActiveSensors(sub)
			: sub.status.status === status && !hasNoActiveSensors(sub),
	);

	const emptyTableBody = (
		<TableRow>
			<TableCell className="text-center text-zinc-500">{t((x) => x.exposureLevel.noInDanger)}</TableCell>
		</TableRow>
	);

	const tableBody =
		workers.length === 0
			? emptyTableBody
			: workers.map((worker) => <WorkerRow key={worker.id} worker={worker} status={status} />);

	return (
		<BasePopup title={exposureTitle} open={open} onClose={onClose}>
			<Table>
				<TableBody>{tableBody}</TableBody>
			</Table>
		</BasePopup>
	);
}
