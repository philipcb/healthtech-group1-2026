import { DEFAULT_USER, USER_STORAGE_KEY } from "@/features/user/user-utils.ts";
import { type ZodType, z } from "zod";

const baseURL = import.meta.env.VITE_API_BASE_URL;

function getSignedInUserId(): string {
	try {
		const stored = localStorage.getItem(USER_STORAGE_KEY);

		if (stored) {
			return JSON.parse(stored).id;
		}
	} catch (error) {
		console.error("Failed to parse user from local storage", error);
		localStorage.removeItem(USER_STORAGE_KEY);
	}

	return DEFAULT_USER.id;
}

export class ApiError extends Error {
	readonly status: number;

	constructor(method: string, path: string, status: number, body: string) {
		super(`${method} ${path} failed with status ${status}${body ? `: ${body}` : ""}`);
		this.name = "ApiError";
		this.status = status;
	}
}

export class ApiValidationError extends Error {
	constructor(method: string, path: string, problem: string, options?: ErrorOptions) {
		super(`${method} ${path} returned an invalid response: ${problem}`, options);
		this.name = "ApiValidationError";
	}
}

/** Orval uses this as the error type of the generated hooks. `Error` is TanStack Query's default. */
export type ErrorType<_ResponseBody> = Error;

type ApiRequestInit = RequestInit & {
	schema?: ZodType;
};

/**
 * The Orval mutator, which sends every request of the generated client.
 *
 * Returns the response body parsed with `schema`, so it is validated and its dates are `TZDate` before TanStack Query
 * caches it. Throws an `ApiError` if the response status is not 2xx, and an `ApiValidationError` if the body doesn't
 * match the schema, or if there is a body but no schema to validate it.
 *
 * Paths are absolute like in the OpenAPI spec (`/api/...`), so they resolve against the origin of `VITE_API_BASE_URL`.
 */
export async function apiFetch<T>(path: string, { schema, ...init }: ApiRequestInit = {}): Promise<T> {
	const url = new URL(path, baseURL);
	// NOTE: For the prototype we don't have proper authentication, so we do a make-shift solution where the client includes the signed in user ID in the query parameters of each request
	url.searchParams.set("signedInUserId", getSignedInUserId());

	const response = await fetch(url.toString(), {
		...init,
		headers: {
			"Content-Type": "application/json",
			...init.headers,
		},
	});
	const body = await response.text();
	const method = init.method ?? "GET";

	if (!response.ok) {
		throw new ApiError(method, path, response.status, body);
	}

	const json: unknown = body ? JSON.parse(body) : undefined;

	if (!schema) {
		if (json !== undefined) {
			throw new ApiValidationError(method, path, "there is no schema to validate it with");
		}

		return undefined as T;
	}

	const result = await schema.safeParseAsync(json);

	if (!result.success) {
		throw new ApiValidationError(method, path, z.prettifyError(result.error), { cause: result.error });
	}

	return result.data as T;
}
