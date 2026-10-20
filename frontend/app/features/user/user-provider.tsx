import type { User } from "@/features/user/user.ts";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { UserContext } from "./user-context.tsx";
import { DEFAULT_USER, DEMO_FALLBACK_USERS, USER_STORAGE_KEY } from "./user-utils.ts";

export const UserProvider = ({ children }: { children: ReactNode }) => {
	const [user, setUserState] = useState<User>(() => {
		try {
			const stored = localStorage.getItem(USER_STORAGE_KEY);

			if (stored) {
				const storedUser = JSON.parse(stored) as User;
				// A stored demo user is replaced by its current version, since it only exists in the frontend
				const demoUser = Object.values(DEMO_FALLBACK_USERS).find((demo) => demo.id === storedUser.id);
				if (demoUser) {
					localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(demoUser));
					return demoUser;
				}
				return storedUser;
			}
		} catch (error) {
			console.error("Failed to parse user from local storage", error);
			localStorage.removeItem(USER_STORAGE_KEY);
		}

		return DEFAULT_USER;
	});

	const setUser = useCallback((newUser: User) => {
		setUserState(newUser);
		localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
	}, []);

	const value = useMemo(() => ({ user, setUser }), [user, setUser]);

	return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
