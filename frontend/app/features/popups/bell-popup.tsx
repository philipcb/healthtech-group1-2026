import { Notifications } from "@/components/notifications.tsx";
import { BasePopup } from "./base-popup.tsx";

export function BellPopup({
	title,
	open,
	onClose,
	children,
}: {
	title: string;
	open: boolean;
	onClose: () => void;
	children?: React.ReactNode;
}) {
	return (
		<BasePopup title={title} open={open} onClose={onClose}>
			<Notifications onParentClose={onClose} />
			{children}
		</BasePopup>
	);
}
