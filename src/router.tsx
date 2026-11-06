import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { NotFound } from "./components/not-found";
import { PageError } from "./components/page-error";
import { PagePending } from "./components/page-pending";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30_000,
				retry: 1,
			},
		},
	});

	const router = createTanStackRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		defaultPreload: "intent",
		// кэшированием данных управляет TanStack Query, а не роутер
		defaultPreloadStaleTime: 0,
		defaultPendingComponent: PagePending,
		defaultErrorComponent: PageError,
		defaultNotFoundComponent: () => <NotFound />,
		Wrap: ({ children }) => (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		),
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
