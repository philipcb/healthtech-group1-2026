import { Button } from "@/components/ui/button.tsx";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, type To, useLocation, useNavigate } from "react-router";

/**
 * Goes back to the page the user came from. When the page was opened directly (no history in the app),
 * it links to `fallback` instead, so the button never leaves the app.
 */
export function BackButton({ fallback }: { fallback: To }) {
	const { t } = useTranslation();
	const location = useLocation();
	const navigate = useNavigate();
	const label = t(($) => $.safetyJourney.common.back);
	const content = (
		<>
			<ArrowLeft aria-hidden={true} className="size-4" />
			{label}
		</>
	);

	// React Router gives the first page of a session the key "default"
	if (location.key === "default") {
		return (
			<Button asChild={true} variant="ghost" size="sm" className="-ml-2 w-fit">
				<Link to={fallback}>{content}</Link>
			</Button>
		);
	}

	return (
		<Button
			type="button"
			variant="ghost"
			size="sm"
			className="-ml-2 w-fit cursor-pointer"
			onClick={() => navigate(-1)}
		>
			{content}
		</Button>
	);
}
