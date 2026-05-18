import { headers } from "next/headers";
import Link from "next/link";

import { getAdminIdentityFromHeaders } from "@/lib/admin-auth";
import { getOrCreateActiveContest } from "@/lib/contest";
import { appEnv } from "@/lib/env";
import { formatInstagramHandle } from "@/lib/instagram";
import { getPrisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const headerList = await headers();
  const identity = getAdminIdentityFromHeaders(headerList);

  if (!identity) {
    return (
      <main className="shell">
        <section className="panel">
          <h1>401</h1>
          <p>Админка закрыта. Настройте Cloudflare Access или передавайте ADMIN_TOKEN в защищённом контуре.</p>
        </section>
      </main>
    );
  }

  if (!appEnv.databaseUrl) {
    return (
      <main className="shell">
        <section className="panel">
          <h1>Нужен DATABASE_URL</h1>
          <p>Подключите Postgres и выполните миграции Prisma, чтобы открыть рабочую панель конкурса.</p>
          <code className="mono">npm run prisma:migrate</code>
        </section>
      </main>
    );
  }

  try {
    const dashboard = await getDashboardData();

    return (
      <main className="shell">
        <header className="topbar">
          <div className="brand">
            <h1>Админка конкурса</h1>
            <p>
              {dashboard.contest.title}: {formatInstagramHandle(dashboard.contest.instagramAccount1)} и{" "}
              {formatInstagramHandle(dashboard.contest.instagramAccount2)}
            </p>
          </div>
          <nav className="nav">
            <Link className="button secondary" href="/">
              Главная
            </Link>
            <Link className="button secondary" href="/rules">
              Условия
            </Link>
          </nav>
        </header>

        <section className="grid three">
          <Metric label="Всего заявок" value={dashboard.totalEntries} />
          <Metric label="Промежуточно подтверждены" value={dashboard.approvedMiddle} />
          <Metric label="Финально допущены" value={dashboard.approvedFinal} />
        </section>

        <section className="grid two section-gap">
          <div className="panel">
            <h2>Импорт followers</h2>
            <form className="form-grid" action="/api/admin/import" method="post" encType="multipart/form-data">
              <input type="hidden" name="contestId" value={dashboard.contest.id} />
              <div className="field">
                <label htmlFor="stage">Этап</label>
                <select id="stage" name="stage" required defaultValue="middle">
                  <option value="start">start</option>
                  <option value="middle">middle</option>
                  <option value="final">final</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="account">Аккаунт</label>
                <select id="account" name="account" required defaultValue="account_1">
                  <option value="account_1">{formatInstagramHandle(dashboard.contest.instagramAccount1)}</option>
                  <option value="account_2">{formatInstagramHandle(dashboard.contest.instagramAccount2)}</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="file">Файл</label>
                <input id="file" name="file" type="file" accept=".json,.csv,.txt,application/json,text/csv,text/plain" required />
              </div>
              <div className="field">
                <label>&nbsp;</label>
                <button type="submit">Загрузить</button>
              </div>
            </form>
          </div>

          <div className="panel">
            <h2>Операции</h2>
            <div className="toolbar">
              <ActionForm action="/api/admin/checks/run" contestId={dashboard.contest.id} label="Запустить сверку" withStage />
              <ActionForm action="/api/admin/notifications/middle" contestId={dashboard.contest.id} label="Напомнить" />
              <ActionForm action="/api/admin/draw" contestId={dashboard.contest.id} label="Выбрать победителя" />
            </div>
            <div className="toolbar section-gap">
              <a className="button secondary" href={`/api/admin/export?contestId=${dashboard.contest.id}&type=all`}>
                Все CSV
              </a>
              <a className="button secondary" href={`/api/admin/export?contestId=${dashboard.contest.id}&type=eligible`}>
                Допущенные CSV
              </a>
              <a className="button secondary" href={`/api/admin/export?contestId=${dashboard.contest.id}&type=result`}>
                Результат CSV
              </a>
            </div>
          </div>
        </section>

        <section className="grid two section-gap">
          <div className="panel">
            <h2>Последние импорты</h2>
            {dashboard.latestBatches.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Этап</th>
                    <th>Аккаунт</th>
                    <th>Файл</th>
                    <th>Followers</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.latestBatches.map((batch) => (
                    <tr key={batch.id}>
                      <td className="mono">{batch.stage}</td>
                      <td>{batch.instagramAccount}</td>
                      <td>{batch.fileName}</td>
                      <td>{batch.followersCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="empty">Импортов пока нет.</p>
            )}
          </div>

          <div className="panel">
            <h2>Розыгрыш</h2>
            {dashboard.latestDraw ? (
              <table>
                <tbody>
                  <tr>
                    <th>Статус</th>
                    <td>{dashboard.latestDraw.status}</td>
                  </tr>
                  <tr>
                    <th>Участников</th>
                    <td>{dashboard.latestDraw.eligibleCount}</td>
                  </tr>
                  <tr>
                    <th>Telegram</th>
                    <td>@{dashboard.latestDraw.winnerEntry.user.telegramUsername ?? dashboard.latestDraw.winnerEntry.user.telegramId.toString()}</td>
                  </tr>
                  <tr>
                    <th>Instagram</th>
                    <td>@{dashboard.latestDraw.winnerEntry.instagramUsername}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="empty">Победитель ещё не выбирался.</p>
            )}
          </div>
        </section>

        <section className="panel section-gap">
          <h2>Участники</h2>
          {dashboard.recentEntries.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Telegram</th>
                  <th>Telegram ID</th>
                  <th>Instagram</th>
                  <th>Статус</th>
                  <th>Создано</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>@{entry.user.telegramUsername ?? "unknown"}</td>
                    <td className="mono">{entry.user.telegramId.toString()}</td>
                    <td>@{entry.instagramUsername}</td>
                    <td>
                      <span className={`status ${statusClass(entry.status)}`}>{entry.status}</span>
                    </td>
                    <td className="mono">{formatDate(entry.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty">Заявок пока нет.</p>
          )}
        </section>
      </main>
    );
  } catch (error) {
    return (
      <main className="shell">
        <section className="panel">
          <h1>Админка недоступна</h1>
          <p>{error instanceof Error ? error.message : "Неизвестная ошибка"}</p>
        </section>
      </main>
    );
  }
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ActionForm({
  action,
  contestId,
  label,
  withStage = false,
}: {
  action: string;
  contestId: string;
  label: string;
  withStage?: boolean;
}) {
  return (
    <form action={action} method="post" className="toolbar">
      <input type="hidden" name="contestId" value={contestId} />
      {withStage ? (
        <select name="stage" aria-label="Этап" defaultValue="middle">
          <option value="start">start</option>
          <option value="middle">middle</option>
          <option value="final">final</option>
        </select>
      ) : null}
      <button type="submit">{label}</button>
    </form>
  );
}

async function getDashboardData() {
  const db = getPrisma();
  const contest = await getOrCreateActiveContest(db);

  const [statusGroups, latestBatches, recentEntries, latestDraw] = await Promise.all([
    db.contestEntry.groupBy({
      by: ["status"],
      where: { contestId: contest.id },
      _count: { _all: true },
    }),
    db.importBatch.findMany({
      where: { contestId: contest.id },
      orderBy: { uploadedAt: "desc" },
      take: 8,
    }),
    db.contestEntry.findMany({
      where: { contestId: contest.id },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.drawResult.findFirst({
      where: { contestId: contest.id },
      include: {
        winnerEntry: {
          include: { user: true },
        },
      },
      orderBy: { drawnAt: "desc" },
    }),
  ]);

  const countByStatus = new Map(statusGroups.map((group) => [group.status, group._count._all]));
  const totalEntries = [...countByStatus.values()].reduce((sum, count) => sum + count, 0);

  return {
    contest,
    totalEntries,
    approvedMiddle: countByStatus.get("approved_middle") ?? 0,
    approvedFinal: countByStatus.get("approved_final") ?? 0,
    latestBatches,
    recentEntries,
    latestDraw,
  };
}

function statusClass(status: string): "ok" | "warn" | "danger" {
  if (status.includes("approved") || status === "winner" || status === "winner_candidate") {
    return "ok";
  }

  if (status === "pending") {
    return "warn";
  }

  return "danger";
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}
