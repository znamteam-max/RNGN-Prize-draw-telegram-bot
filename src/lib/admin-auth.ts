import { NextResponse } from "next/server";

import { appEnv } from "@/lib/env";

export type AdminIdentity = {
  id: string;
  source: "token" | "cloudflare-access" | "development";
};

type HeaderReader = {
  get(name: string): string | null;
};

export function getAdminIdentityFromHeaders(headers: HeaderReader): AdminIdentity | null {
  const authorization = headers.get("authorization");
  const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : null;
  const headerToken = headers.get("x-admin-token");

  if (appEnv.adminToken && (headerToken === appEnv.adminToken || bearerToken === appEnv.adminToken)) {
    return { id: "admin-token", source: "token" };
  }

  const cloudflareEmail = appEnv.trustCloudflareAccess
    ? headers.get("cf-access-authenticated-user-email")
    : null;

  if (cloudflareEmail) {
    return { id: cloudflareEmail, source: "cloudflare-access" };
  }

  if (process.env.NODE_ENV !== "production" && !appEnv.adminToken) {
    return { id: "local-dev", source: "development" };
  }

  return null;
}

export function requireAdmin(headers: HeaderReader): AdminIdentity {
  const identity = getAdminIdentityFromHeaders(headers);

  if (!identity) {
    throw new Error("Unauthorized admin request");
  }

  return identity;
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
