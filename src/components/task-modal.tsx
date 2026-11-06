import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { StatusBadge } from "#/components/status-badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Skeleton } from "#/components/ui/skeleton";
import { formatDateTime } from "#/lib/format";
import { STATUS_LABEL } from "#/lib/task-status";
import { taskHistoryQueryOptions, taskQueryOptions } from "#/queries/tasks";

/**
 * Модалка задачи. Открыта, пока в адресе есть ?task=<id>.
 * Данные обычно уже в кэше: loader экрана загружает их по ?task,
 * а наведение на строку задачи делает это заранее (preload).
 */
export function TaskModal({
	taskId,
	onClose,
}: {
	taskId: number | undefined;
	onClose: () => void;
}) {
	return (
		<Dialog
			open={taskId !== undefined}
			onOpenChange={(open) => !open && onClose()}
		>
			<DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
				{taskId !== undefined && (
					<Suspense fallback={<TaskModalSkeleton />}>
						<TaskDetails taskId={taskId} />
					</Suspense>
				)}
			</DialogContent>
		</Dialog>
	);
}

function TaskDetails({ taskId }: { taskId: number }) {
	const { data: task } = useSuspenseQuery(taskQueryOptions(taskId));
	const { data: history } = useSuspenseQuery(taskHistoryQueryOptions(taskId));

	if (!task) {
		return (
			<DialogHeader>
				<DialogTitle>Задача не найдена</DialogTitle>
				<DialogDescription>
					Задача удалена или у вас нет к ней доступа.
				</DialogDescription>
			</DialogHeader>
		);
	}

	const reworkComment =
		task.status === "rework"
			? history.filter((entry) => entry.to_status === "rework").at(-1)?.comment
			: null;

	return (
		<div className="flex flex-col gap-5">
			<DialogHeader className="pr-8">
				<div className="flex items-start gap-2">
					<DialogTitle className="text-base">{task.title}</DialogTitle>
					<StatusBadge status={task.status} />
				</div>
				<DialogDescription className="whitespace-pre-wrap">
					{task.description || "Без описания"}
				</DialogDescription>
			</DialogHeader>

			<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
				<dt className="text-muted-foreground">Объект</dt>
				<dd>
					{task.object ? (
						<Link
							to="/objects/$objectId"
							params={{ objectId: task.object.id }}
							className="text-primary underline-offset-4 hover:underline"
						>
							{task.object.name}
						</Link>
					) : (
						"—"
					)}
				</dd>
				<dt className="text-muted-foreground">Исполнитель</dt>
				<dd>{task.assignee?.full_name ?? "—"}</dd>
				<dt className="text-muted-foreground">Автор</dt>
				<dd>{task.author?.full_name ?? "—"}</dd>
				<dt className="text-muted-foreground">Создана</dt>
				<dd>{formatDateTime(task.created_at)}</dd>
			</dl>

			{reworkComment && (
				<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm dark:border-red-900 dark:bg-red-950/40">
					<div className="mb-1 font-medium">Что исправить</div>
					<p className="whitespace-pre-wrap">{reworkComment}</p>
				</div>
			)}

			{/* Кнопки действий (смена статуса, редактирование) — этап мутаций */}

			<section className="flex flex-col gap-2">
				<h3 className="text-sm font-medium">История</h3>
				<ol className="flex flex-col gap-3 border-l pl-4">
					{history.map((entry) => (
						<li key={entry.id} className="text-sm">
							<div>
								{entry.from_status === null
									? "Задача создана"
									: `${STATUS_LABEL[entry.from_status]} → ${STATUS_LABEL[entry.to_status]}`}
							</div>
							<div className="text-xs text-muted-foreground">
								{entry.changed_by?.full_name ?? "—"} ·{" "}
								{formatDateTime(entry.changed_at)}
							</div>
							{entry.comment && (
								<p className="mt-1 whitespace-pre-wrap text-muted-foreground">
									«{entry.comment}»
								</p>
							)}
						</li>
					))}
				</ol>
			</section>
		</div>
	);
}

function TaskModalSkeleton() {
	return (
		<div className="flex flex-col gap-3">
			<Skeleton className="h-6 w-2/3" />
			<Skeleton className="h-4 w-full" />
			<Skeleton className="h-20 w-full" />
			<Skeleton className="h-24 w-full" />
		</div>
	);
}
