import type { NavLinkItem } from "@/features/layout/nav-links.ts";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

function normalizePathname(path: string) {
	if (path === "/") return path;
	return path.replace(/\/+$/, "");
}

export function useTabPill(routes: Array<NavLinkItem>, pathname: string) {
	const navLinkRefs = useRef<Array<HTMLElement>>([]);
	const [pillWidth, setPillWidth] = useState<number>();
	const [pillLeft, setPillLeft] = useState<number>();

	const activeNavIndex = routes.findIndex(
		(route) => normalizePathname(route.to.toString()) === normalizePathname(pathname),
	);

	useLayoutEffect(() => {
		const el = navLinkRefs.current[activeNavIndex];
		if (!el) return;

		const observer = new ResizeObserver(() => {
			setPillWidth(el.offsetWidth);
			setPillLeft(el.offsetLeft);
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, [activeNavIndex]);

	const setNavLinkRef = useCallback((index: number, el: HTMLElement | null) => {
		if (!el) return;
		navLinkRefs.current[index] = el;
	}, []);

	return { setNavLinkRef, pillWidth, pillLeft };
}
