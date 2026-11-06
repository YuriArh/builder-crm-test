import { useSuspenseQuery } from "@tanstack/react-query";
import { type FormEvent, Suspense, useState } from "react";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select";
import { Skeleton } from "#/components/ui/skeleton";
import { Textarea } from "#/components/ui/textarea";
import { objectsQueryOptions } from "#/queries/objects";
import { executorsQueryOptions } from "#/queries/profile";
import { useCreateTask } from "#/queries/task-mutations";

export function CreateTaskDialog({
	objectId,
	open,
	onOpenChange,
}: {
	objectId: number;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Новая задача</DialogTitle>
				</DialogHeader>
				{open && (
					// Списки исполнителей и объектов обычно уже в кэше: их заранее загружает loader карточки объекта
					<Suspense fallback={<FormSkeleton />}>
						<CreateTaskForm
							defaultObjectId={objectId}
							onDone={() => onOpenChange(false)}
						/>
					</Suspense>
				)}
			</DialogContent>
		</Dialog>
	);
}

function CreateTaskForm({
	defaultObjectId,
	onDone,
}: {
	defaultObjectId: number;
	onDone: () => void;
}) {
	const { data: executors } = useSuspenseQuery(executorsQueryOptions());
	const { data: objects } = useSuspenseQuery(objectsQueryOptions());
	const mutation = useCreateTask();

	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [objectId, setObjectId] = useState(defaultObjectId);
	const [assigneeId, setAssigneeId] = useState<string | null>(null);

	const canSubmit =
		title.trim() !== "" && assigneeId !== null && !mutation.isPending;

	function handleSubmit(event: FormEvent) {
		event.preventDefault();
		if (!canSubmit || assigneeId === null) return;
		mutation.mutate(
			{
				object_id: objectId,
				title: title.trim(),
				description: description.trim() || null,
				assignee_id: assigneeId,
			},
			{ onSuccess: onDone },
		);
	}

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-4">
			<FormField id="task-title" label="Название">
				<Input
					id="task-title"
					autoFocus
					required
					maxLength={200}
					value={title}
					onChange={(event) => setTitle(event.target.value)}
				/>
			</FormField>
			<FormField id="task-description" label="Описание (необязательно)">
				<Textarea
					id="task-description"
					maxLength={5000}
					value={description}
					onChange={(event) => setDescription(event.target.value)}
				/>
			</FormField>
			<FormField id="task-object" label="Объект">
				<Select
					required
					value={objectId}
					onValueChange={(value) => {
						if (value !== null) setObjectId(value);
					}}
					items={objects.map((object) => ({
						value: object.id,
						label: object.name,
					}))}
				>
					<SelectTrigger id="task-object" className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{objects.map((object) => (
							<SelectItem key={object.id} value={object.id}>
								{object.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</FormField>
			<FormField id="task-assignee" label="Исполнитель">
				<Select
					required
					value={assigneeId}
					onValueChange={setAssigneeId}
					// items нужен SelectValue, чтобы в поле показывалось имя, а не id
					items={executors.map((executor) => ({
						value: executor.id,
						label: executor.full_name,
					}))}
				>
					<SelectTrigger id="task-assignee" className="w-full">
						<SelectValue placeholder="Выберите исполнителя" />
					</SelectTrigger>
					<SelectContent>
						{executors.map((executor) => (
							<SelectItem key={executor.id} value={executor.id}>
								{executor.full_name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</FormField>

			<p className="text-xs text-muted-foreground">
				Задача будет создана в статусе «Новая». Исполнителя после создания
				изменить нельзя.
			</p>

			<FormError error={mutation.error} />

			<DialogFooter>
				<Button
					type="button"
					variant="outline"
					onClick={onDone}
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

function FormSkeleton() {
	return (
		<div className="flex flex-col gap-3">
			<Skeleton className="h-7 w-full" />
			<Skeleton className="h-16 w-full" />
			<Skeleton className="h-7 w-full" />
			<Skeleton className="h-7 w-full" />
		</div>
	);
}
