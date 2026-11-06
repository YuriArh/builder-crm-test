import { Link } from "@tanstack/react-router";
import {
	STATUS_LABEL,
	TASK_STATUSES,
	type TaskStatus,
} from "#/lib/task-status";
import { cn } from "#/lib/utils";

type TaskListRoute = "/objects/$objectId" | "/my-tasks";

const chipClass =
	"rounded-full border px-3 py-1 text-xs text-muted-foreground hover:text-foreground";
const activeChipClass =
	"border-foreground bg-foreground text-background hover:text-background";

/** Чипы фильтра пишут ?status в адрес: фильтр переживает перезагрузку и попадает в ссылку. */
export function StatusFilter({
	from,
	value,
}: {
	from: TaskListRoute;
	value: TaskStatus | undefined;
}) {
	const options: Array<TaskStatus | undefined> = [undefined, ...TASK_STATUSES];

	return (
		<div className="flex flex-wrap gap-2">
			{options.map((status) => (
				<Link
					key={status ?? "all"}
					from={from}
					to="."
					search={(prev) => ({ ...prev, status, task: undefined })}
					replace
					className={cn(chipClass, value === status && activeChipClass)}
				>
					{status ? STATUS_LABEL[status] : "Все"}
				</Link>
			))}
		</div>
	);
}
