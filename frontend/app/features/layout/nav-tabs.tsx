import { useDate } from "@/features/date-picker/use-date.ts";
import type { NavLinkItem } from "@/features/layout/nav-links.ts";
import { useTabPill } from "@/features/layout/use-tab-pill.ts";
import { useView } from "@/features/views/use-view.ts";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import { cn } from "@/lib/utils.ts";
import { NavLink, useLocation } from "react-router";

export function NavTabs({ routes }: { routes: Array<NavLinkItem> }) {
	const { view } = useView();
	const { date } = useDate();
	const location = useLocation();
	const formatDate = useFormatDate();

	const { setNavLinkRef, pillWidth, pillLeft } = useTabPill(routes, location.pathname);

	return (
		<div className="relative mx-auto flex h-11 flex-row rounded-full bg-accent px-2 dark:bg-card">
			<div
				className="absolute top-0 bottom-0 z-10 flex overflow-hidden rounded-full py-1 transition-all duration-300"
				style={{ left: pillLeft, width: pillWidth }}
			>
				<span className="h-full w-full rounded-full bg-background shadow-sm" />
			</div>

			{routes.map((route, i) => {
				const className = ({ isActive }: { isActive: boolean }) =>
					cn(
						"z-20 flex cursor-pointer select-none items-center rounded-full px-5 py-2",
						"text-center font-medium text-muted-foreground text-sm hover:text-foreground",
						isActive && "text-foreground",
					);

				return (
					<NavLink
						end={true}
						to={{
							pathname: route.to.toString(),
							search: `?view=${view}&date=${formatDate(date, "yyyy-MM-dd")}`,
						}}
						key={route.to.toString()}
						ref={(el) => setNavLinkRef(i, el)}
						className={className}
						prefetch="intent"
					>
						<span className="inline-flex items-center gap-2.5">{route.label}</span>
					</NavLink>
				);
			})}
		</div>
	);
}
