const dashboardRoutes = {
  area_manager: "/area_manager/dashboard",
} as const;

const publicRootScreens = new Set([
  "index", "company", "login", "forgot_password", "verify_otp", "reset_password", "+not-found",
]);

export type SessionRouteGroup = keyof typeof dashboardRoutes;
export const sessionRouteGroups = Object.keys(
  dashboardRoutes
) as SessionRouteGroup[];

export interface SessionIdentity {
  userId: string;
  categoryId: string;
  routeGroup: SessionRouteGroup;
}

function positiveId(value: unknown): string | null {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
    return String(value);
  }
  return typeof value === "string" && /^[1-9][0-9]*$/.test(value) ? value : null;
}

export function parseSessionIdentity(
  user: unknown,
  category: unknown,
  folder: unknown,
): SessionIdentity | null {
  const userId = positiveId(user);
  const categoryId = positiveId(category);
  // The login API supplies the category's folder. The app only opens shipped groups.
  if (
    !userId || !categoryId || typeof folder !== "string" ||
    !Object.hasOwn(dashboardRoutes, folder)
  ) return null;

  return { userId, categoryId, routeGroup: folder as SessionRouteGroup };
}

export function getSessionDashboard(identity: SessionIdentity) {
  return dashboardRoutes[identity.routeGroup];
}

export function canOpenRootScreen(name: string, ready: boolean, identity: SessionIdentity | null) {
  if (publicRootScreens.has(name)) return true;
  return ready && identity !== null &&
    (name === "common" || (Object.hasOwn(dashboardRoutes, name) && name === identity.routeGroup));
}
