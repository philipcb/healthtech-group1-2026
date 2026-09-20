import { useFormatDate } from "@/hooks/use-format-date.ts";
import { useTemporaryFlag } from "@/hooks/use-temporary-flag.ts";
import { now } from "@/lib/date.ts";
import { TZDate } from "@date-fns/tz";
import { isBefore } from "date-fns";
import { Share, Trash2 } from "lucide-react";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { BasePopup } from "./base-popup.tsx";
import { DateRangeForm } from "./date-range-form.tsx";

interface PrivacySettingsPopupProps {
	open: boolean;
	onClose: () => void;
	children?: React.ReactNode;
}

export type DateFormValues = {
	fromDate?: TZDate;
	toDate?: TZDate;
};

export function PrivacySettingsPopup({ open, onClose, children }: PrivacySettingsPopupProps) {
	const { t } = useTranslation();
	const title = t(($) => $.profile.privacySettings);

	const form = useForm<DateFormValues>({
		defaultValues: { fromDate: undefined, toDate: undefined },
		mode: "onChange",
	});

	const formatDate = useFormatDate();

	const shareForm = useForm<DateFormValues>({
		defaultValues: { fromDate: undefined, toDate: undefined },
		mode: "onChange",
	});

	const MIN_DATA_DATE = new TZDate(2025, 0, 1, "Europe/Oslo");
	const MAX_DATA_DATE = now();
	const TIMEOUT_5000_MS = 5000;

	const [showDeleteText, triggerDeleteConfirmation] = useTemporaryFlag(TIMEOUT_5000_MS);
	const [showShareDataConfirmationMessage, triggerShareConfirmation] = useTemporaryFlag(TIMEOUT_5000_MS);

	const handleShareSubmit = useCallback(
		(data: DateFormValues) => {
			if (data.fromDate && data.toDate) {
				triggerShareConfirmation();
			}
		},
		[triggerShareConfirmation],
	);

	const handleSubmit = useCallback(
		(data: DateFormValues) => {
			if (data.fromDate && data.toDate && isBefore(data.toDate, data.fromDate)) {
				form.setError("toDate", { message: t(($) => $.popup.invalidDate) });
				setTimeout(() => form.clearErrors("toDate"), TIMEOUT_5000_MS);
				return;
			}
			triggerDeleteConfirmation();
		},
		[form, t, triggerDeleteConfirmation],
	);

	return (
		<BasePopup title={title} open={open} onClose={onClose}>
			{children}

			<div className="mx-auto flex flex-col gap-4 pt-6 text-sm">
				<div className="flex flex-col gap-2">
					<p className="label text-muted-foreground">{t(($) => $.share.hygienist.button)}</p>
					<DateRangeForm
						form={shareForm}
						onSubmit={handleShareSubmit}
						minDate={MIN_DATA_DATE}
						maxDate={MAX_DATA_DATE}
						submitLabel={t(($) => $.share.hygienist.shareData)}
						submitIcon={<Share />}
						showConfirmation={showShareDataConfirmationMessage}
						confirmationText={(from, to) =>
							t(($) => $.share.hygienist.confirmation, {
								from: formatDate(from, "d MMMM yyyy"),
								to: formatDate(to, "d MMMM yyyy"),
							})
						}
					/>
				</div>

				<div className="flex flex-col gap-2">
					<p className="label text-muted-foreground">{t(($) => $.profile.deletePersonalInformation)}</p>
					<DateRangeForm
						form={form}
						onSubmit={handleSubmit}
						minDate={MIN_DATA_DATE}
						maxDate={MAX_DATA_DATE}
						submitLabel={t(($) => $.popup.deleteData)}
						submitIcon={<Trash2 />}
						destructive={true}
						showConfirmation={showDeleteText}
						confirmationText={(from, to) =>
							t(($) => $.popup.dataDeleted, {
								from: formatDate(from, "d MMMM yyyy"),
								to: formatDate(to, "d MMMM yyyy"),
							})
						}
					/>
				</div>
			</div>
		</BasePopup>
	);
}
