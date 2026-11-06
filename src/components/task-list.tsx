import type { ReactNode } from "react";
import { EmptyState } from "#/components/empty-state";
import { StatusBadge } from "#/components/status-badge";
import { formatDateTime } from "#/lib/format";
import { STATUS_LABEL, type TaskStatus } from "#/lib/task-status";

export function TaskList({
	isEmpty,
	filter,
	emptyText,
	children,
}: {
	isEmpty: boolean;
	filter: TaskStatus | undefined;
	emptyText: string;
	children: ReactNode;
}) {
	if (isEmpty) {
		return (
			<EmptyState>
				{filter ? `Нет задач в статусе «${STATUS_LABEL[filter]}»` : emptyText}
			</EmptyState>
		);
	}
	return (
		<ul className="flex flex-col divide-y rounded-lg border">{children}</ul>
	);
}

/** Содержимое строки задачи; ссылку (с ?task) задаёт экран — у каждого свой маршрут. */
export function TaskRowContent({
	title,
	status,
	createdAt,
	meta,
}: {
	title: string;
	status: TaskStatus;
	createdAt: string;
	meta: ReactNode;
}) {
	return (
		<div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
			<div className="min-w-0 flex-1">
				<div className="truncate text-sm font-medium">{title}</div>
				<div className="truncate text-xs text-muted-foreground">
					{meta} · {formatDateTime(createdAt)}
				</div>
			</div>
			<StatusBadge status={status} />
		</div>
	);
}
