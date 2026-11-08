import { Button } from "@/components/ui/button.tsx";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field.tsx";
import { Input } from "@/components/ui/input.tsx";
import type { NewReward } from "@/features/safety-journey/model/types.ts";
import { type FormEvent, useId, useState } from "react";
import { useTranslation } from "react-i18next";

const emptyForm = { name: "", cost: "", value: "", perPerson: "" };

export function AddRewardForm({ onAdd }: { onAdd: (reward: NewReward) => void }) {
	const { t } = useTranslation();
	const ids = { name: useId(), cost: useId(), value: useId(), perPerson: useId() };
	const [form, setForm] = useState(emptyForm);

	const set = (key: keyof typeof emptyForm) => (event: React.ChangeEvent<HTMLInputElement>) =>
		setForm((current) => ({ ...current, [key]: event.target.value }));

	const onSubmit = (event: FormEvent) => {
		event.preventDefault();
		onAdd({
			customName: form.name.trim(),
			cost: Number(form.cost),
			valueKr: Number(form.value),
			maxPerPersonPerMonth: Number(form.perPerson),
		});
		setForm(emptyForm);
	};

	return (
		<section className="flex flex-col gap-3 rounded-lg border bg-card p-4">
			<h2 className="font-semibold">{t(($) => $.safetyJourney.rewardsSettings.form.title)}</h2>
			<form onSubmit={onSubmit}>
				<FieldGroup className="gap-3">
					<Field>
						<FieldLabel htmlFor={ids.name}>
							{t(($) => $.safetyJourney.rewardsSettings.form.name)}
						</FieldLabel>
						<Input
							id={ids.name}
							required={true}
							value={form.name}
							onChange={set("name")}
							placeholder={t(($) => $.safetyJourney.rewardsSettings.form.namePlaceholder)}
						/>
					</Field>
					<div className="grid grid-cols-2 gap-3">
						<Field>
							<FieldLabel htmlFor={ids.cost}>
								{t(($) => $.safetyJourney.rewardsSettings.form.cost)}
							</FieldLabel>
							<Input
								id={ids.cost}
								type="number"
								min={1}
								required={true}
								value={form.cost}
								onChange={set("cost")}
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor={ids.value}>
								{t(($) => $.safetyJourney.rewardsSettings.form.value)}
							</FieldLabel>
							<Input
								id={ids.value}
								type="number"
								min={0}
								required={true}
								value={form.value}
								onChange={set("value")}
							/>
						</Field>
					</div>
					<Field>
						<FieldLabel htmlFor={ids.perPerson}>
							{t(($) => $.safetyJourney.rewardsSettings.form.perPerson)}
						</FieldLabel>
						<Input
							id={ids.perPerson}
							type="number"
							min={1}
							required={true}
							value={form.perPerson}
							onChange={set("perPerson")}
						/>
					</Field>
					<Button type="submit" className="cursor-pointer">
						{t(($) => $.safetyJourney.rewardsSettings.form.submit)}
					</Button>
				</FieldGroup>
			</form>
		</section>
	);
}
