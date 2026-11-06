import { useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Label } from "#/components/ui/label";
import { Textarea } from "#/components/ui/textarea";
import {
	getStatusActions,
	type StatusAction,
	type TaskStatus,
} from "#/lib/task-status";
import {
	statusChangeErrorMessage,
	useChangeTaskStatus,
} from "#/queries/task-mutations";

const COMMENT_MAX_LENGTH = 2000;

/** Кнопки смены статуса: только те, что доступны текущему пользователю в текущем статусе. */
export function TaskStatusActions({
	task,
}: {
	task: { id: number; status: TaskStatus; assignee: { id: string } | null };
}) {
	const { profile, user } = useRouteContext({ from: "/_app" });
	const mutation = useChangeTaskStatus(task.id);
	const [commentFor, setCommentFor] = useState<StatusAction | null>(null);
	const [comment, setComment] = useState("");

	const actions = getStatusActions(
		profile.role,
		task.assignee?.id === user.id,
		task.status,
	);

	if (actions.length === 0 && !mutation.isError) return null;

	function submit(action: StatusAction, actionComment?: string) {
		mutation.mutate(
			{ to: action.to, comment: actionComment },
			{
				onSuccess: () => {
					setCommentFor(null);
					setComment("");
				},
				// при ошибке форма с комментарием остаётся открытой, текст не теряется
			},
		);
	}

	return (
		<section className="flex flex-col gap-3">
			{commentFor ? (
				<form
					className="flex flex-col gap-2"
					onSubmit={(event) => {
						event.preventDefault();
						submit(commentFor, comment.trim());
					}}
				>
					<Label htmlFor="status-comment">Что нужно исправить</Label>
					<Textarea
						id="status-comment"
						autoFocus
						required
						maxLength={COMMENT_MAX_LENGTH}
						value={comment}
						onChange={(event) => setComment(event.target.value)}
					/>
					<div className="flex justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							disabled={mutation.isPending}
							onClick={() => {
								setCommentFor(null);
								mutation.reset();
							}}
						>
							Отмена
						</Button>
						<Button
							type="submit"
							variant={commentFor.variant}
							disabled={mutation.isPending || comment.trim() === ""}
						>
							{mutation.isPending ? "Сохранение…" : commentFor.label}
						</Button>
					</div>
				</form>
			) : (
				<div className="flex flex-wrap gap-2">
					{actions.map((action) => (
						<Button
							key={action.to}
							variant={action.variant}
							disabled={mutation.isPending}
							onClick={() => {
								mutation.reset();
								if (action.requiresComment) setCommentFor(action);
								else submit(action);
							}}
						>
							{action.label}
						</Button>
					))}
				</div>
			)}

			{mutation.isError && (
				<p role="alert" className="text-sm text-destructive">
					{statusChangeErrorMessage(mutation.error)}
				</p>
			)}
		</section>
	);
}
