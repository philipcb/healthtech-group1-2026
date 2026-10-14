import type { User } from "@/lib/dto/user.ts";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { UserContext } from "./user-context.tsx";
import {
	DEFAULT_USER,
	OCCUPATIONAL_HEALTH_SERVICE_DEMO_USER,
	OCCUPATIONAL_HEALTH_SERVICE_DEMO_USER_ID,
	USER_STORAGE_KEY,
} from "./user-utils.ts";

export const UserProvider = ({ children }: { children: ReactNode }) => {
	const [user, setUserState] = useState<User>(() => {
		try {
			const stored = localStorage.getItem(USER_STORAGE_KEY);

			if (stored) {
				const storedUser = JSON.parse(stored) as User;
				if (storedUser.id === OCCUPATIONAL_HEALTH_SERVICE_DEMO_USER_ID) {
					localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(OCCUPATIONAL_HEALTH_SERVICE_DEMO_USER));
					return OCCUPATIONAL_HEALTH_SERVICE_DEMO_USER;
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
