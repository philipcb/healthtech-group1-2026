import { useCallback, useState } from "react";

export function useTemporaryFlag(durationMs: number) {
	const [flag, setFlag] = useState(false);

	const trigger = useCallback(() => {
		setFlag(true);
		setTimeout(() => setFlag(false), durationMs);
	}, [durationMs]);

	return [flag, trigger] as const;
}
