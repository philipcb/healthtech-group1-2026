import { href, NavLink } from "react-router";

const Logo = () => (
	<svg width="44" height="40" viewBox="0 0 44 40" fill="none" xmlns="http://www.w3.org/2000/svg">
		<title>{"HealthTech Logo"}</title>
		<path
			d="M42.8334 20H34.5001L28.2501 38.75L15.7501 1.25L9.50008 20H1.16675"
			stroke="#A4D4DB"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);

export function HomeLink() {
	return (
		<NavLink
			to={href("/")}
			className="flex cursor-pointer items-center space-x-2 text-foreground transition-colors hover:text-primary/90"
		>
			<div className="text-2xl">
				<Logo />
			</div>
			<span className="hidden text-xl sm:inline-block">{"HealthTech"}</span>
		</NavLink>
	);
}
