import { type FormEvent, useState } from "react";
import { FormError, FormField } from "#/components/form-field";
import { ObjectSelect } from "#/components/object-select";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Textarea } from "#/components/ui/textarea";
import { useUpdateTask } from "#/queries/task-mutations";

type EditableTask = {
	id: number;
	title: string;
	description: string | null;
	object: { id: number } | null;
	assignee: { full_name: string } | null;
};

/**
 * Форма редактирования задачи в модалке. Исполнитель только показан:
 * менять его база не даёт (нет права UPDATE на assignee_id).
 */
export function TaskEditForm({
	task,
	onCancel,
	onSaved,
}: {
	task: EditableTask;
	onCancel: () => void;
	/** movedToObjectId — задан, если задачу перенесли в другой объект */
	onSaved: (movedToObjectId: number | null) => void;
}) {
	const mutation = useUpdateTask(task.id);
	const initialObjectId = task.object?.id ?? 0;

	const [title, setTitle] = useState(task.title);
	const [description, setDescription] = useState(task.description ?? "");
	const [objectId, setObjectId] = useState(initialObjectId);

	const changed =
		title.trim() !== task.title ||
		(description.trim() || null) !== task.description ||
		objectId !== initialObjectId;
	const canSubmit =
		title.trim() !== "" && objectId > 0 && changed && !mutation.isPending;

	function handleSubmit(event: FormEvent) {
		event.preventDefault();
		if (!canSubmit) return;
		mutation.mutate(
			{
				object_id: objectId,
				title: title.trim(),
				description: description.trim() || null,
			},
			{
				onSuccess: () =>
					onSaved(objectId !== initialObjectId ? objectId : null),
			},
		);
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			<FormField id="edit-task-title" label="Название">
				<Input
					id="edit-task-title"
					autoFocus
					required
					maxLength={200}
					value={title}
					onChange={(event) => setTitle(event.target.value)}
				/>
			</FormField>
			<FormField id="edit-task-description" label="Описание (необязательно)">
				<Textarea
					id="edit-task-description"
					maxLength={5000}
					value={description}
					onChange={(event) => setDescription(event.target.value)}
				/>
			</FormField>
			<FormField id="edit-task-object" label="Объект">
				<ObjectSelect
					id="edit-task-object"
					value={objectId}
					onChange={setObjectId}
				/>
			</FormField>
			<div className="flex flex-col gap-1.5 text-sm">
				<span className="font-medium">Исполнитель</span>
				<span>{task.assignee?.full_name ?? "—"}</span>
				<span className="text-xs text-muted-foreground">
					Исполнителя после создания задачи изменить нельзя. Статус при
					редактировании не меняется.
				</span>
			</div>

			<FormError error={mutation.error} />

			<div className="flex justify-end gap-2">
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={mutation.isPending}
				>
					Отмена
				</Button>
				<Button type="submit" disabled={!canSubmit}>
					{mutation.isPending ? "Сохранение…" : "Сохранить"}
				</Button>
			</div>
		</form>
	);
}
