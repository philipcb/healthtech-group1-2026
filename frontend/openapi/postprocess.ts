import assert from "node:assert/strict";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const DATE_TIME_SCHEMA = 'zod.iso.datetime({"offset":true})';
const TZ_DATE_IMPORT = "import { tzDateSchema } from '@/lib/date.ts';";
const ZOD_IMPORT = "import * as zod from 'zod';";
const INPUT_TYPE = /^export type (\w+) = zod\.input<typeof \1>;$/m;

// The prefixes `setApiQueryDefaults` in app/lib/query-client.ts matches the generated query keys with
const QUERY_KEY_PREFIXES = [["api"], ["POST", "api"]];
const NOTES_QUERY_KEY = { name: "getGetNotesQueryKey", prefix: ["POST", "api", "notes"] };

function transformModel(fileName: string, source: string): { source: string; dateTimes: number } {
	assert.match(source, INPUT_TYPE, `${fileName}: Orval no longer exports the Zod input type`);
	let result = source.replace(INPUT_TYPE, "export type $1 = zod.output<typeof $1>;");

	const isQueryParams = fileName.endsWith("Params.zod.ts");
	const dateTimes = isQueryParams ? 0 : result.split(DATE_TIME_SCHEMA).length - 1;
	if (dateTimes > 0) {
		assert.ok(result.includes(ZOD_IMPORT), `${fileName}: Orval no longer imports Zod as expected`);
		result = result
			.replaceAll(DATE_TIME_SCHEMA, "tzDateSchema")
			.replace(ZOD_IMPORT, `${ZOD_IMPORT}\n${TZ_DATE_IMPORT}`);
	}

	return { source: result, dateTimes };
}

function findUnvalidatedRequests(source: string): Array<string> {
	const calls = [...source.matchAll(/apiFetch<(.+?)>\((\w+)\(([\s\S]*?)\n\);/g)];
	assert.ok(calls.length > 0, "Orval no longer calls `apiFetch` as expected");
	return calls
		.filter(([call, responseType]) => responseType !== "void" && !/\n\s*schema: /.test(call))
		.map(([, , urlFunction]) => urlFunction);
}

/** The string literals each generated query key starts with, by the name of its key function */
function findQueryKeyPrefixes(source: string): Map<string, Array<string>> {
	const declarations = source.match(/^export const get\w+QueryKey = /gm) ?? [];
	const keys = [
		...source.matchAll(/^export const (get\w+QueryKey) = \([\s\S]*?\) => \{\s*return \[([\s\S]*?)\] as const;/gm),
	];
	assert.equal(keys.length, declarations.length, "Orval no longer generates query keys as expected");

	return new Map(
		keys.map(([, name, elements]) => {
			const parts = elements.split(",").map((part) => part.trim());
			const firstNonLiteral = parts.findIndex((part) => !/^'[^']*'$/.test(part));
			const literals = firstNonLiteral === -1 ? parts : parts.slice(0, firstNonLiteral);
			return [name, literals.map((literal) => literal.slice(1, -1))];
		}),
	);
}

const startsWith = (key: Array<string>, prefix: Array<string>) => prefix.every((part, index) => key[index] === part);

function transformAndCheck(generatedDir: string) {
	const modelsDir = join(generatedDir, "models");
	const models = readdirSync(modelsDir).filter((file) => file.endsWith(".zod.ts"));
	assert.ok(models.length > 0, `No Zod schemas in ${modelsDir}`);

	let dateTimes = 0;
	for (const file of models) {
		const path = join(modelsDir, file);
		const result = transformModel(file, readFileSync(path, "utf8"));
		writeFileSync(path, result.source);
		dateTimes += result.dateTimes;
	}
	assert.ok(dateTimes > 0, "No date-time schemas found in the generated models");

	const clients = readdirSync(generatedDir).filter((file) => file.endsWith(".ts"));
	const queryKeys = new Map<string, Array<string>>();
	for (const file of clients) {
		const source = readFileSync(join(generatedDir, file), "utf8");
		const unvalidated = findUnvalidatedRequests(source);
		assert.deepEqual(unvalidated, [], `${file}: these requests don't validate their response`);
		for (const [name, prefix] of findQueryKeyPrefixes(source)) {
			queryKeys.set(name, prefix);
		}
	}

	assert.ok(queryKeys.size > 0, "No query keys found in the generated client");
	for (const [name, key] of queryKeys) {
		assert.ok(
			QUERY_KEY_PREFIXES.some((prefix) => startsWith(key, prefix)),
			`${name} starts with [${key.join(", ")}], so the query defaults in app/lib/query-client.ts don't apply to it`,
		);
	}
	assert.ok(
		startsWith(queryKeys.get(NOTES_QUERY_KEY.name) ?? [], NOTES_QUERY_KEY.prefix),
		`${NOTES_QUERY_KEY.name} doesn't start with [${NOTES_QUERY_KEY.prefix.join(", ")}], so the notes' query defaults in app/lib/query-client.ts don't apply to it`,
	);
}

export function postprocessGeneratedClient(generatedDir: string) {
	try {
		transformAndCheck(generatedDir);
	} catch (error) {
		// Orval only logs an error from a hook, so this makes generation fail
		process.exitCode = 1;
		throw error;
	}
}
