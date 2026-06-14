import { buttonClass } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import Admin from "@/routes/Admin";
import Landing from "@/routes/Landing";
import Room from "@/routes/Room";
import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
} from "@tanstack/react-router";
import { Analytics } from "@vercel/analytics/react";

function RootLayout() {
  return (
    <>
      <Outlet />
      <Toaster />
      <Analytics />
    </>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-dots px-5 text-center">
      <div className="text-6xl">🤷</div>
      <h1 className="text-3xl font-extrabold">Page not found</h1>
      <p className="max-w-sm text-muted-foreground">
        We looked under every desk. This page isn't here.
      </p>
      <Link to="/" className={buttonClass()}>
        Back to safety
      </Link>
    </div>
  );
}

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Landing,
});

const roomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/$slug",
  component: Room,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/$slug/admin",
  component: Admin,
});

const routeTree = rootRoute.addChildren([indexRoute, roomRoute, adminRoute]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
