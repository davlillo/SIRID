import "server-only";

import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { API_URL, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";

/** Forward request cookies only to the configured backend, never to redirects. */
export async function serverRequest<T>(path: string): Promise<T> {
  const base = new URL(`${API_URL.replace(/\/$/, "")}/`);
  const url = new URL(`${base.href}${path.replace(/^\//, "")}`);
  if (!path.startsWith("/") || url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) {
    throw new Error("Invalid backend request path");
  }

  const cookieHeader = (await cookies()).toString();
  const response = await fetch(url, {
    headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    cache: "no-store",
    redirect: "error",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.title ?? "Error inesperado",
      payload?.detail ?? "No se pudo completar la solicitud.",
    );
  }
  return payload as T;
}

export async function getServerSession(): Promise<User | null> {
  try {
    return await serverRequest<User>("/auth/me");
  } catch (error) {
    if (error instanceof ApiError && error.isUnauthorized) return null;
    // Backend failures must not downgrade an authenticated request to public browsing.
    throw error;
  }
}

export async function resolveServerOrganization(requested?: string): Promise<string | undefined> {
  const user = await getServerSession();
  if (user?.role !== "CLIENT") return requested;
  if (!user.organization_id) notFound();
  return user.organization_id;
}
