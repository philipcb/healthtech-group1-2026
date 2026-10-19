// Fails if regenerating the API client changed or added a generated file, so the committed client is out of date
import { execFileSync } from "node:child_process";

const changes = execFileSync("git", ["status", "--porcelain", "--untracked-files=all", "--", "app/lib/api/generated"], {
	encoding: "utf8",
});

if (changes) {
	console.error(
		`The generated API client is out of date. Run \`pnpm api:generate\` and commit the result.\n${changes}`,
	);
	process.exit(1);
}
