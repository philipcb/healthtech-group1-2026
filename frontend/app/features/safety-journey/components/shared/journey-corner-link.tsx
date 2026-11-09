import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.tsx";
import { COLORS } from "@/features/safety-journey/model/colors.ts";
import { Star } from "lucide-react";
import { Link, type To } from "react-router";

/** The star icon in the header for foreman and management, linking to their Safety Journey page */
export function JourneyCornerLink({ to, label }: { to: To; label: string }) {
	return (
		<Tooltip>
			<TooltipTrigger asChild={true}>
				<Link
					to={to}
					aria-label={label}
					className="flex size-9 items-center justify-center rounded-full border hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<Star className="size-4" style={{ color: COLORS.gold }} aria-hidden={true} />
				</Link>
			</TooltipTrigger>
			<TooltipContent>{label}</TooltipContent>
		</Tooltip>
	);
}
