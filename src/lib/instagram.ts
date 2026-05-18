const INSTAGRAM_USERNAME_RE = /^[a-z0-9._]{1,30}$/;

export function formatInstagramHandle(username: string): string {
  return `@${username.replace(/^@/, "")}`;
}

export function instagramProfileUrl(username: string): string {
  return `https://www.instagram.com/${username.replace(/^@/, "")}/`;
}

export function isValidInstagramUsername(value: string): boolean {
  return INSTAGRAM_USERNAME_RE.test(value);
}

export function normalizeInstagramUsername(input: string): string | null {
  let value = input.trim().toLowerCase();

  if (!value) {
    return null;
  }

  value = value.replace(/^@+/, "");
  value = value.replace(/^https?:\/\//, "");
  value = value.replace(/^www\./, "");

  if (value.startsWith("instagram.com/")) {
    value = value.slice("instagram.com/".length);
  }

  value = value.split(/[?#&]/)[0] ?? "";
  value = value.split("/").filter(Boolean)[0] ?? "";
  value = value.replace(/^@+/, "").replace(/\/+$/, "");

  try {
    value = decodeURIComponent(value);
  } catch {
    return null;
  }

  if (!isValidInstagramUsername(value)) {
    return null;
  }

  return value;
}
