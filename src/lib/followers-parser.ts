import { normalizeInstagramUsername } from "@/lib/instagram";

export type FollowersParseResult = {
  usernames: string[];
  followersCount: number;
  errors: string[];
  sourceType: "json" | "csv" | "txt";
};

const USERNAME_KEYS = new Set(["username", "value", "href", "url", "profile_url", "name"]);

export function parseFollowersFile(fileName: string, content: string, contentType?: string): FollowersParseResult {
  const lowerName = fileName.toLowerCase();
  const lowerType = (contentType ?? "").toLowerCase();

  if (lowerType.includes("json") || lowerName.endsWith(".json")) {
    return parseJsonFollowers(content);
  }

  if (lowerType.includes("csv") || lowerName.endsWith(".csv")) {
    return parseCsvFollowers(content);
  }

  return parseTextFollowers(content);
}

function parseJsonFollowers(content: string): FollowersParseResult {
  const errors: string[] = [];
  const usernames = new Set<string>();

  try {
    const parsed = JSON.parse(content) as unknown;
    collectJsonUsernames(parsed, usernames);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Invalid JSON");
  }

  return buildResult("json", usernames, errors);
}

function collectJsonUsernames(value: unknown, usernames: Set<string>, key = "", loose = false): void {
  if (typeof value === "string") {
    if (loose || USERNAME_KEYS.has(key) || value.includes("instagram.com/")) {
      addUsername(usernames, value);
    }

    return;
  }

  if (Array.isArray(value)) {
    const arrayIsPlainList = value.every((item) => typeof item === "string");
    for (const item of value) {
      collectJsonUsernames(item, usernames, key, loose || arrayIsPlainList || key === "string_list_data");
    }

    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  for (const [childKey, childValue] of Object.entries(value)) {
    collectJsonUsernames(childValue, usernames, childKey, loose || key === "string_list_data");
  }
}

function parseCsvFollowers(content: string): FollowersParseResult {
  const rows = parseCsvRows(content);
  const usernames = new Set<string>();
  const errors: string[] = [];

  if (rows.length === 0) {
    return buildResult("csv", usernames, ["CSV is empty"]);
  }

  const header = rows[0].map((cell) => cell.trim().replace(/^\uFEFF/, "").toLowerCase());
  const usernameIndex = header.findIndex((cell) => cell === "username" || cell === "user_name" || cell === "instagram_username");
  const startIndex = usernameIndex >= 0 ? 1 : 0;
  const columnIndex = usernameIndex >= 0 ? usernameIndex : 0;

  for (const row of rows.slice(startIndex)) {
    const cell = row[columnIndex];

    if (cell) {
      addUsername(usernames, cell);
    }
  }

  return buildResult("csv", usernames, errors);
}

function parseTextFollowers(content: string): FollowersParseResult {
  const usernames = new Set<string>();

  for (const line of content.split(/\r?\n/)) {
    addUsername(usernames, line);
  }

  return buildResult("txt", usernames, []);
}

function parseCsvRows(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }

      row.push(cell.trim());
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell || row.length > 0) {
    row.push(cell.trim());
    rows.push(row);
  }

  return rows.filter((candidate) => candidate.some(Boolean));
}

function addUsername(usernames: Set<string>, value: string): void {
  const username = normalizeInstagramUsername(value);

  if (username) {
    usernames.add(username);
  }
}

function buildResult(
  sourceType: FollowersParseResult["sourceType"],
  usernames: Set<string>,
  errors: string[],
): FollowersParseResult {
  const sorted = [...usernames].sort((left, right) => left.localeCompare(right));

  return {
    usernames: sorted,
    followersCount: sorted.length,
    errors,
    sourceType,
  };
}
