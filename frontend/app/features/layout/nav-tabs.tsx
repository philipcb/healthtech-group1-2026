import { useDate } from "@/features/date-picker/use-date.ts";
import { getLinks } from "@/features/layout/nav-links.ts";
import { useTabPill } from "@/features/layout/use-tab-pill.ts";
import { useUser } from "@/features/user/user-context.tsx";
import { useView } from "@/features/views/use-view.ts";
import { useFormatDate } from "@/hooks/use-format-date.ts";
import { cn } from "@/lib/utils.ts";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "react-router";

type NavTabsProps = {
	/** `floating` is the frosted-glass pill used for the mobile bottom bar. */
	variant?: "header" | "floating";
};

export function NavTabs({ variant = "header" }: NavTabsProps) {
	const { t } = useTranslation();
	const { user } = useUser();
	const { view } = useView();
	const { date } = useDate();
	const location = useLocation();
	const formatDate = useFormatDate();

	const routes = getLinks(t, user?.role ?? null);

	const { setNavLinkRef, pillWidth, pillLeft } = useTabPill(routes, location.pathname);

	const isFloating = variant === "floating";

	return (
		<div
			className={cn(
				"relative mx-auto flex flex-row rounded-full",
				isFloating
					? [
							// Fills the nav's gutters up to a comfortable cap; overflow-x only kicks in if labels can't fit.
							"pointer-events-auto h-14 w-full max-w-xl overflow-x-auto px-1.5 [scrollbar-width:none] min-[360px]:h-16",
							// Near-opaque fallback keeps labels readable where backdrop-filter is unsupported.
							"border border-border/60 bg-background/95 shadow-lg ring-1 ring-black/5 dark:ring-white/5",
							"supports-[backdrop-filter]:bg-background/70 supports-[backdrop-filter]:backdrop-blur-xl supports-[backdrop-filter]:backdrop-saturate-150",
						]
					: "h-11 bg-accent px-2 dark:bg-card",
			)}
		>
			<div
				className={cn(
					"absolute top-0 bottom-0 z-10 flex overflow-hidden rounded-full transition-all duration-300 ease-out motion-reduce:transition-none",
					isFloating ? "py-1.5" : "py-1",
				)}
				style={{ left: pillLeft, width: pillWidth }}
			>
				<span
					className={cn(
						"h-full w-full rounded-full",
						isFloating ? "bg-accent shadow-xs" : "bg-background shadow-sm",
					)}
				/>
			</div>

			{routes.map((route, i) => {
				const className = ({ isActive }: { isActive: boolean }) =>
					cn(
						"z-20 flex cursor-pointer select-none items-center rounded-full",
						"text-center font-medium",
						isFloating
							? [
									// Equal-width tabs that never shrink below their label.
									"flex-1 justify-center whitespace-nowrap px-2 text-xs min-[360px]:text-sm",
									"text-foreground/70 transition-colors duration-200 hover:text-foreground motion-reduce:transition-none",
									"focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-4",
									isActive && "text-accent-foreground hover:text-accent-foreground",
								]
							: [
									"px-2 py-2 text-muted-foreground text-xs hover:text-foreground lg:px-5 lg:text-sm",
									isActive && "text-foreground",
								],
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
