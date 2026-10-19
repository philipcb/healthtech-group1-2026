import { defineConfig } from "orval";
import { postprocessGeneratedClient } from "./openapi/postprocess.ts";

const GENERATED_DIR = "./app/lib/api/generated";

// See `app/lib/api/README.md`
export default defineConfig({
	backend: {
		input: {
			target: "./openapi.json",
			override: {
				transformer: "./openapi/corrections.ts",
			},
		},
		output: {
			mode: "tags",
			target: `${GENERATED_DIR}/backend.ts`,
			schemas: { path: `${GENERATED_DIR}/models`, type: "zod" },
			client: "react-query",
			httpClient: "fetch",
			clean: true,
			override: {
				// ASP.NET also lists `text/plain` and `text/json`, which would generate a duplicate type for each of them
				contentType: {
					include: ["application/json"],
				},
				mutator: {
					path: "./app/lib/api/http-client.ts",
					name: "apiFetch",
				},
				// Passes each response's Zod schema to `apiFetch`, which validates the response with it
				includeZodSchemaInArguments: true,
				fetch: {
					// `apiFetch` returns the response body, not `{ data, status, headers }`
					includeHttpResponseReturnType: false,
					runtimeValidation: true,
				},
				query: {
					version: 5,
					// Requests aren't cancelled when their query is
					signal: false,
					// Keys like `['api', 'users', managerId, 'subordinates', params]`, so query defaults and invalidation can
					// match on a prefix
					shouldSplitQueryKey: true,
				},
				operations: {
					// These read data but are `POST` requests, which Orval would otherwise generate as mutations
					getNotes: { query: { useQuery: true, useMutation: false } },
					getExposureData: { query: { useQuery: true, useMutation: false } },
					getExposureOverview: { query: { useQuery: true, useMutation: false } },
				},
			},
		},
		hooks: {
			afterAllFilesWrite: () => postprocessGeneratedClient(GENERATED_DIR),
		},
	},
});
