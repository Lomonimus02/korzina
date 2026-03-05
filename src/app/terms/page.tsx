import { Metadata } from "next";
import Link from "next/link";
import { Code2, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Публичная оферта | Moonely",
  description: "Публичная оферта на оказание услуг сервиса Moonely",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 md:px-8 mx-auto">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl">
            <img src="/logo.svg" alt="Moonely" className="h-8 w-8" />
            <span>Moonely</span>
          </Link>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 md:px-8 py-12">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          На главную
        </Link>

        <h1 className="text-3xl md:text-4xl font-bold mb-8">Публичная оферта</h1>
        
        <div className="prose prose-invert prose-zinc max-w-none">
          <p className="text-zinc-400 mb-8">
            Дата вступления в силу: 1 декабря 2025 года
            <br />
            Последнее обновление: 22 декабря 2025 года
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">1. Общие положения</h2>
            <p className="text-zinc-300 mb-4">
              1.1. Настоящий документ является официальной публичной офертой (далее — «Оферта») сервиса Moonely (далее — «Исполнитель») и содержит все существенные условия предоставления услуг по созданию веб-сайтов с использованием технологий искусственного интеллекта.
            </p>
            <p className="text-zinc-300 mb-4">
              1.2. В соответствии со статьёй 437 Гражданского кодекса Российской Федерации данный документ является публичной офертой, адресованной неопределённому кругу лиц.
            </p>
            <p className="text-zinc-300 mb-4">
              1.3. Акцептом настоящей Оферты является регистрация на сайте moonely.ru и/или оплата любого тарифа. Акцепт означает полное и безоговорочное согласие с условиями Оферты.
            </p>
            <p className="text-zinc-300 mb-4">
              1.4. Пользователь, совершивший акцепт Оферты, именуется «Заказчик».
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">2. Термины и определения</h2>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
              <li><strong>Сервис</strong> — онлайн-платформа Moonely, доступная по адресу moonely.ru</li>
              <li><strong>Кредиты</strong> — внутренняя валюта Сервиса, используемая для оплаты генераций</li>
              <li><strong>Генерация</strong> — процесс создания или модификации веб-сайта с помощью ИИ по запросу Заказчика</li>
              <li><strong>Проект</strong> — веб-сайт или приложение, созданное Заказчиком с помощью Сервиса</li>
              <li><strong>Тариф</strong> — пакет услуг с определённым количеством кредитов и функций</li>
              <li><strong>Деплой</strong> — публикация проекта в сети Интернет</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">3. Предмет Оферты</h2>
            <p className="text-zinc-300 mb-4">
              3.1. Исполнитель обязуется предоставить Заказчику доступ к Сервису для создания веб-сайтов с использованием технологий искусственного интеллекта, а Заказчик обязуется оплатить услуги в соответствии с выбранным тарифом.
            </p>
            <p className="text-zinc-300 mb-4">
              3.2. Сервис предоставляет следующие возможности:
            </p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
              <li>Генерация веб-сайтов по текстовому описанию</li>
              <li>Модификация существующих проектов</li>
              <li>Загрузка изображений для использования в проектах</li>
              <li>Просмотр и редактирование исходного кода</li>
              <li>Публикация проектов на поддомене Сервиса</li>
              <li>Экспорт исходного кода проекта</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">4. Тарифы и оплата</h2>
            <p className="text-zinc-300 mb-4">
              4.1. Актуальные тарифы и цены указаны на странице moonely.ru/pricing. Исполнитель вправе изменять тарифы без предварительного уведомления, при этом оплаченные услуги предоставляются по ценам на момент оплаты.
            </p>
            <p className="text-zinc-300 mb-4">
              4.2. Оплата производится в российских рублях через платёжную систему YooKassa. Исполнитель не хранит платёжные данные Заказчика.
            </p>
            <p className="text-zinc-300 mb-4">
              4.3. Кредиты начисляются на баланс Заказчика сразу после подтверждения платежа. Неиспользованные кредиты не сгорают и не имеют срока действия.
            </p>
            <p className="text-zinc-300 mb-4">
              4.4. Стоимость одной генерации списывается автоматически после успешного завершения запроса к ИИ.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">5. Права и обязанности сторон</h2>
            
            <h3 className="text-lg font-medium mb-3 text-white">5.1. Исполнитель обязуется:</h3>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
              <li>Обеспечить работоспособность Сервиса 24/7, за исключением периодов технического обслуживания</li>
              <li>Обеспечить сохранность данных и проектов Заказчика</li>
              <li>Предоставить техническую поддержку по электронной почте</li>
              <li>Уведомлять о существенных изменениях в работе Сервиса</li>
            </ul>

            <h3 className="text-lg font-medium mb-3 text-white">5.2. Исполнитель вправе:</h3>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
              <li>Приостановить доступ к Сервису при нарушении Заказчиком условий Оферты</li>
              <li>Удалить контент, нарушающий законодательство или права третьих лиц</li>
              <li>Изменять функциональность Сервиса</li>
              <li>Устанавливать лимиты на использование ресурсов</li>
            </ul>

            <h3 className="text-lg font-medium mb-3 text-white">5.3. Заказчик обязуется:</h3>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
              <li>Предоставить достоверные данные при регистрации</li>
              <li>Не использовать Сервис для создания противоправного контента</li>
              <li>Не предпринимать попыток обхода технических ограничений</li>
              <li>Не передавать доступ к аккаунту третьим лицам</li>
              <li>Своевременно оплачивать услуги</li>
            </ul>

            <h3 className="text-lg font-medium mb-3 text-white">5.4. Заказчик вправе:</h3>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
              <li>Использовать все функции Сервиса в рамках оплаченного тарифа</li>
              <li>Экспортировать исходный код своих проектов</li>
              <li>Использовать созданные проекты в любых законных целях</li>
              <li>Обращаться в техническую поддержку</li>
              <li>Удалить свой аккаунт в любое время</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">6. Интеллектуальная собственность</h2>
            <p className="text-zinc-300 mb-4">
              6.1. Все права на Сервис, включая программный код, дизайн, торговые знаки, принадлежат Исполнителю.
            </p>
            <p className="text-zinc-300 mb-4">
              6.2. Заказчик сохраняет все права на контент, загруженный им в Сервис (тексты, изображения).
            </p>
            <p className="text-zinc-300 mb-4">
              6.3. Права на сгенерированный с помощью ИИ код передаются Заказчику. Заказчик вправе использовать, модифицировать и распространять этот код без ограничений.
            </p>
            <p className="text-zinc-300 mb-4">
              6.4. Исполнитель вправе использовать анонимизированные данные о созданных проектах для улучшения качества Сервиса.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">7. Ограничение ответственности</h2>
            <p className="text-zinc-300 mb-4">
              7.1. Сервис предоставляется «как есть» (as is). Исполнитель не гарантирует, что Сервис будет соответствовать всем требованиям Заказчика.
            </p>
            <p className="text-zinc-300 mb-4">
              7.2. Исполнитель не несёт ответственности за:
            </p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
              <li>Качество и точность результатов генерации ИИ</li>
              <li>Убытки, возникшие в результате использования или невозможности использования Сервиса</li>
              <li>Действия третьих лиц</li>
              <li>Временную недоступность Сервиса по техническим причинам</li>
              <li>Потерю данных в результате форс-мажорных обстоятельств</li>
            </ul>
            <p className="text-zinc-300 mb-4">
              7.3. Совокупная ответственность Исполнителя ограничена суммой, уплаченной Заказчиком за последние 3 месяца.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">8. Возврат средств</h2>
            <p className="text-zinc-300 mb-4">
              8.1. Возврат средств возможен в следующих случаях:
            </p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
              <li>Технический сбой, не позволивший воспользоваться оплаченными услугами</li>
              <li>Двойное списание средств</li>
              <li>Отмена в течение 24 часов после оплаты при неиспользованных кредитах</li>
            </ul>
            <p className="text-zinc-300 mb-4">
              8.2. Для оформления возврата необходимо обратиться на selenium.studio.web@gmail.com с описанием ситуации и подтверждением платежа.
            </p>
            <p className="text-zinc-300 mb-4">
              8.3. Срок рассмотрения заявки на возврат — до 10 рабочих дней. Срок зачисления средств зависит от банка Заказчика.
            </p>
            <p className="text-zinc-300 mb-4">
              8.4. Частично использованные кредиты возврату не подлежат.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">9. Запрещённое использование</h2>
            <p className="text-zinc-300 mb-4">
              9.1. Запрещается использовать Сервис для создания:
            </p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
              <li>Контента, нарушающего законодательство РФ</li>
              <li>Материалов, пропагандирующих насилие, ненависть или дискриминацию</li>
              <li>Порнографического или сексуально откровенного контента</li>
              <li>Фишинговых или мошеннических сайтов</li>
              <li>Сайтов, распространяющих вредоносное ПО</li>
              <li>Контента, нарушающего авторские права третьих лиц</li>
            </ul>
            <p className="text-zinc-300 mb-4">
              9.2. При обнаружении нарушений Исполнитель вправе немедленно заблокировать аккаунт без возврата средств.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">10. Срок действия и расторжение</h2>
            <p className="text-zinc-300 mb-4">
              10.1. Оферта вступает в силу с момента акцепта и действует бессрочно.
            </p>
            <p className="text-zinc-300 mb-4">
              10.2. Заказчик вправе в любое время удалить свой аккаунт и прекратить использование Сервиса.
            </p>
            <p className="text-zinc-300 mb-4">
              10.3. Исполнитель вправе расторгнуть договор в одностороннем порядке при нарушении Заказчиком условий Оферты.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">11. Разрешение споров</h2>
            <p className="text-zinc-300 mb-4">
              11.1. Все споры решаются путём переговоров. Претензионный порядок обязателен, срок ответа на претензию — 30 дней.
            </p>
            <p className="text-zinc-300 mb-4">
              11.2. При невозможности урегулирования спор передаётся на рассмотрение в суд по месту нахождения Исполнителя в соответствии с законодательством Российской Федерации.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">12. Заключительные положения</h2>
            <p className="text-zinc-300 mb-4">
              12.1. Исполнитель вправе вносить изменения в Оферту. Новая редакция вступает в силу с момента публикации на сайте.
            </p>
            <p className="text-zinc-300 mb-4">
              12.2. Недействительность отдельных положений Оферты не влечёт недействительности остальных положений.
            </p>
            <p className="text-zinc-300 mb-4">
              12.3. По вопросам, не урегулированным Офертой, стороны руководствуются законодательством Российской Федерации.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">13. Реквизиты и контакты</h2>
            <p className="text-zinc-300 mb-4">
              ИНН: 783800671814
            </p>
            <p className="text-zinc-300 mb-4">
              По всем вопросам обращайтесь:
            </p>
            <p className="text-zinc-300">
              Email: <a href="mailto:selenium.studio.web@gmail.com" className="text-indigo-400 hover:text-indigo-300">selenium.studio.web@gmail.com</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
