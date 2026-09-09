import { Button } from "@/components/ui/button.tsx";
import { BellPopup } from "@/features/popups/bell-popup.tsx";
import { usePopup } from "@/features/popups/use-popup.ts";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";

export function NotificationBell() {
	const { t } = useTranslation();
	const { visible, openPopup, closePopup } = usePopup();

	return (
		<>
			<Button variant="ghost" size="icon" onClick={openPopup} className="cursor-pointer rounded-full">
				<div className="relative">
					<Bell className="size-5" />
					<span className="absolute -top-2 -right-2 flex size-4.75 items-center justify-center rounded-full border-2 border-background bg-red-600 text-[0.625rem] text-white">
						{"4"}
					</span>
				</div>
			</Button>

			<BellPopup open={visible} onClose={closePopup} title={t(($) => $.common.notifications)} />
		</>
	);
}
