import { Skeleton } from "#/components/ui/skeleton";

export function PagePending() {
	return (
		<div className="mx-auto flex w-full max-w-4xl flex-col gap-3 p-6">
			<Skeleton className="h-7 w-1/3" />
			<Skeleton className="h-16 w-full" />
			<Skeleton className="h-16 w-full" />
			<Skeleton className="h-16 w-full" />
		</div>
	);
}
