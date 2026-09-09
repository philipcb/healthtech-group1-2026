import type { TranslateFn } from "@/i18n/config.ts";
import type { User } from "@/lib/dto/user.ts";
import type { LucideIcon } from "lucide-react";
import { href, type To } from "react-router";

export type NavLinkItem = { to: To; label: string; icon?: LucideIcon };

export function getLinks(t: TranslateFn, role: User["role"] | null): Array<NavLinkItem> {
	switch (role) {
		case null: {
			return [];
		}

		case "operator": {
			return [
				{ to: href("/operator/live"), label: t(($) => $.layout.live) },
				{ to: href("/operator"), label: t(($) => $.layout.overview) },
				{ to: href("/operator/dust"), label: t(($) => $.exposures.dust) },
				{ to: href("/operator/noise"), label: t(($) => $.exposures.noise) },
				{
					to: href("/operator/vibration"),
					label: t(($) => $.exposures.vibration),
				},
			];
		}

		case "foreman": {
			return [
				{
					to: href("/foreman"),
					label: t(($) => $.layout.home),
				},
				{
					to: href("/foreman/map"),
					label: t(($) => $.layout.map),
				},
				{
					to: href("/foreman/team"),
					label: t(($) => $.layout.team),
				},
			];
		}

		default: {
			return [];
		}
	}
}
