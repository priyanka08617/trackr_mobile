const dashboardRoutes = {
  area_manager: "/area_manager/dashboard",
} as const;

export type SessionRouteGroup = keyof typeof dashboardRoutes;

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
