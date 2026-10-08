import { request } from "@/services/apiService";

export type User = Record<string, unknown>;

export function getUsers<T extends User = User>(): Promise<T[]> {
  return request<T[]>("/users");
}

export function getUser<T extends User = User>(
  userId: string | number,
): Promise<T> {
  return request<T>(`/users/${encodeURIComponent(String(userId))}`);
}

export function createUser<T extends User = User>(
  user: Omit<T, "id">,
): Promise<T> {
  return request<T>("/users", { method: "POST", body: user });
}

export function updateUser<T extends User = User>(
  userId: string | number,
  updates: Partial<T>,
): Promise<T> {
  return request<T>(`/users/${encodeURIComponent(String(userId))}`, {
    method: "PATCH",
    body: updates,
  });
}

export function deleteUser(userId: string | number): Promise<void> {
  return request<void>(`/users/${encodeURIComponent(String(userId))}`, {
    method: "DELETE",
  });
}

export const userService = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
};
export default userService;
