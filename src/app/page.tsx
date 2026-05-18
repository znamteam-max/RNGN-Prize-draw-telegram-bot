import Link from "next/link";

import { appEnv } from "@/lib/env";
import { formatInstagramHandle } from "@/lib/instagram";

export default function HomePage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <h1>{appEnv.contestTitle}</h1>
          <p>Telegram-бот конкурса с проверкой по официальным Instagram-выгрузкам.</p>
        </div>
        <nav className="nav">
          <Link className="button secondary" href="/rules">
            Условия
          </Link>
          <Link className="button" href="/admin">
            Админка
          </Link>
        </nav>
      </header>

      <section className="grid two">
        <div className="panel">
          <h2>Участие</h2>
          <p>Участник запускает Telegram-бота, нажимает «Участвовать», подписывается на два Instagram-аккаунта и отправляет свой Instagram-ник.</p>
          <div className="toolbar">
            <span className="status ok">{formatInstagramHandle(appEnv.instagramAccount1)}</span>
            <span className="status ok">{formatInstagramHandle(appEnv.instagramAccount2)}</span>
          </div>
        </div>

        <div className="panel">
          <h2>Проверка</h2>
          <p>Организатор загружает followers-файлы для этапов start, middle и final. В розыгрыш попадают только участники со статусом approved_final.</p>
          <code className="mono">/api/telegram/webhook</code>
        </div>
      </section>
    </main>
  );
}
