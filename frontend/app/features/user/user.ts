import { UserRole as BackendUserRole, type UserDto } from "@/lib/api/generated/models/index.ts";
import { z } from "zod";

/** The backend's roles, and `occupationalHealthService`, a frontend-only role for the demo */
export const UserRoleSchema = z.enum([...BackendUserRole.options, "occupationalHealthService"]);

export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserRole = {
	Operator: "operator",
	Foreman: "foreman",
	OccupationalHealthService: "occupationalHealthService",
} as const satisfies Record<string, UserRole>;

/** A user from the backend, or a demo user with the frontend-only role */
export type User = Omit<UserDto, "role"> & { role: UserRole };
