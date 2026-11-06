import { Badge } from "#/components/ui/badge";
import {
	STATUS_BADGE_CLASS,
	STATUS_LABEL,
	type TaskStatus,
} from "#/lib/task-status";

export function StatusBadge({ status }: { status: TaskStatus }) {
	return (
		<Badge className={STATUS_BADGE_CLASS[status]}>{STATUS_LABEL[status]}</Badge>
	);
}
