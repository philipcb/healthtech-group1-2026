import { Button } from "@/components/ui/button.tsx";
import { BellPopup } from "@/features/popups/bell-popup.tsx";
import { usePopup } from "@/features/popups/use-popup.ts";
import { SHOW_SAFETY_JOURNEY } from "@/features/safety-journey/model/config.ts";
import { useSafetyJourney } from "@/features/safety-journey/state/use-safety-journey.ts";
import { useUser } from "@/features/user/user-context.tsx";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Matches the hardcoded list in components/notifications.tsx */
const HARDCODED_NOTIFICATION_COUNT = 4;

export function NotificationBell() {
	const { t } = useTranslation();
	const { visible, openPopup, closePopup } = usePopup();
	const { user } = useUser();
	const { prompt } = useSafetyJourney();
	// The "what helped?" prompt counts as unread until it is answered or put off
	const hasUnreadPrompt = SHOW_SAFETY_JOURNEY && user.role === "operator" && prompt.status === "ask";
	const count = HARDCODED_NOTIFICATION_COUNT + (hasUnreadPrompt ? 1 : 0);

	return (
		<>
			<Button variant="ghost" size="icon" onClick={openPopup} className="cursor-pointer rounded-full">
				<div className="relative">
					<Bell className="size-5" />
					<span className="absolute -top-2 -right-2 flex size-4.75 items-center justify-center rounded-full border-2 border-background bg-red-600 text-[0.625rem] text-white">
						{count}
					</span>
				</div>
			</Button>

			<BellPopup open={visible} onClose={closePopup} title={t(($) => $.common.notifications)} />
		</>
	);
}
