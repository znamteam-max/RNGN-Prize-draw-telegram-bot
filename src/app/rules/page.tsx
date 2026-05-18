import Link from "next/link";

import { appEnv } from "@/lib/env";
import { formatInstagramHandle } from "@/lib/instagram";

const rules = [
  "Для участия необходимо нажать кнопку «Участвовать» в Telegram-боте, подписаться на оба Instagram-аккаунта и указать свой Instagram-ник.",
  "Проверка выполнения условий проводится по официальным выгрузкам списков подписчиков Instagram.",
  "Организатор может проводить стартовую, промежуточную и финальную проверку.",
  "Решающим является результат финальной проверки перед розыгрышем.",
  "Если участник отсутствует в финальной выгрузке хотя бы одного аккаунта, он не участвует в розыгрыше.",
  "Один Telegram-пользователь может участвовать только один раз.",
  "Организатор может запросить подтверждение владения Instagram-аккаунтом у победителя.",
  "Если выбранный победитель не выполнил условия, организатор вправе выбрать нового победителя.",
];

export default function RulesPage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <h1>Условия конкурса</h1>
          <p>
            Аккаунты: {formatInstagramHandle(appEnv.instagramAccount1)} и {formatInstagramHandle(appEnv.instagramAccount2)}
          </p>
        </div>
        <nav className="nav">
          <Link className="button secondary" href="/">
            Главная
          </Link>
          <Link className="button" href="/admin">
            Админка
          </Link>
        </nav>
      </header>

      <section className="panel rules">
        {rules.map((rule, index) => (
          <p className="rule" key={rule}>
            <strong>{index + 1}.</strong> {rule}
          </p>
        ))}
      </section>
    </main>
  );
}
