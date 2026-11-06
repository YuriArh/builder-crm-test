import { useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { FormError, FormField } from "#/components/form-field";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { useCreateObject } from "#/queries/object-mutations";

export function CreateObjectDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Новый объект</DialogTitle>
				</DialogHeader>
				{/* Форма монтируется заново при каждом открытии — поля и ошибка сбрасываются */}
				{open && <CreateObjectForm onCancel={() => onOpenChange(false)} />}
			</DialogContent>
		</Dialog>
	);
}

function CreateObjectForm({ onCancel }: { onCancel: () => void }) {
	const navigate = useNavigate();
	const mutation = useCreateObject();
	const [name, setName] = useState("");
	const [address, setAddress] = useState("");

	const canSubmit =
		name.trim() !== "" && address.trim() !== "" && !mutation.isPending;

	function handleSubmit(event: FormEvent) {
		event.preventDefault();
		if (!canSubmit) return;
		mutation.mutate(
			{ name: name.trim(), address: address.trim() },
			{
				// новый объект пустой — сразу открываем его карточку, чтобы добавить задачи
				onSuccess: (object) =>
					navigate({
						to: "/objects/$objectId",
						params: { objectId: object.id },
					}),
			},
		);
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			<FormField id="object-name" label="Название">
				<Input
					id="object-name"
					autoFocus
					required
					maxLength={200}
					value={name}
					onChange={(event) => setName(event.target.value)}
				/>
			</FormField>
			<FormField id="object-address" label="Адрес">
				<Input
					id="object-address"
					required
					maxLength={500}
					value={address}
					onChange={(event) => setAddress(event.target.value)}
				/>
			</FormField>

			<FormError error={mutation.error} />

			<DialogFooter>
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={mutation.isPending}
				>
					Отмена
				</Button>
				<Button type="submit" disabled={!canSubmit}>
					{mutation.isPending ? "Сохранение…" : "Создать"}
				</Button>
			</DialogFooter>
		</form>
	);
}
