import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Политика конфиденциальности | Moonely",
  description: "Политика конфиденциальности сервиса Moonely",
};

export default function PrivacyPage() {
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

        <h1 className="text-3xl md:text-4xl font-bold mb-8">Политика конфиденциальности сервиса Moonely</h1>
        
        <div className="prose prose-invert prose-zinc max-w-none">
          <p className="text-zinc-400 mb-8">
            Дата вступления в силу: 16 марта 2026 года
            <br />
            Последнее обновление: 16 марта 2026 года
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">1. Общие положения</h2>
            <p className="text-zinc-300 mb-4">
              1.1. Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок сбора, обработки, хранения, передачи и защиты персональных данных пользователей сервиса Moonely (далее — «Сервис»), расположенного по адресу moonely.ru.
            </p>
            <p className="text-zinc-300 mb-4">1.2. Настоящая Политика разработана в соответствии с:</p>
            <ul className="list-disc list-inside text-zinc-300 space-y-1 mb-4">
              <li>Конституцией Российской Федерации;</li>
              <li>Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных»;</li>
              <li>Федеральным законом от 27.07.2006 № 149-ФЗ «Об информации, информационных технологиях и о защите информации»;</li>
              <li>иными нормативными правовыми актами Российской Федерации в области персональных данных.</li>
            </ul>
            <p className="text-zinc-300 mb-4">
              1.3. Используя Сервис и/или регистрируя учётную запись, Вы подтверждаете, что ознакомились с настоящей Политикой и выражаете согласие на обработку Ваших персональных данных на изложенных условиях. Если Вы не согласны с условиями Политики, пожалуйста, не используйте Сервис.
            </p>
            <p className="text-zinc-300 mb-4">
              1.4. Настоящая Политика распространяется на все персональные данные, которые Оператор может получить о Пользователе во время использования им Сервиса.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">2. Оператор персональных данных</h2>
            <p className="text-zinc-300 mb-4">2.1. Оператором персональных данных является:</p>
            <p className="text-zinc-300 mb-2"><strong>Земсков Михаил Олегович</strong></p>
            <p className="text-zinc-300 mb-2">Самозанятый, применяющий специальный налоговый режим «Налог на профессиональный доход» (Федеральный закон от 27.11.2018 № 422-ФЗ)</p>
            <p className="text-zinc-300 mb-4">ИНН: <strong>783800671814</strong></p>
            <p className="text-zinc-300 mb-4">
              2.2. Контактный адрес электронной почты для вопросов, связанных с обработкой персональных данных: <a href="mailto:selenium.studio.web@gmail.com" className="text-indigo-400 hover:text-indigo-300">selenium.studio.web@gmail.com</a>
            </p>
            <p className="text-zinc-300 mb-4">
              2.3. Оператор определяет цели и средства обработки персональных данных, обеспечивает защиту обрабатываемых персональных данных в соответствии с требованиями законодательства Российской Федерации.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">3. Собираемые персональные данные</h2>
            <p className="text-zinc-300 mb-4">3.1. Оператор собирает и обрабатывает следующие категории персональных данных:</p>
            
            <h3 className="text-lg font-medium mb-3 text-white">3.1.1. Данные учётной записи:</h3>
            <ul className="list-disc list-inside text-zinc-300 space-y-1 mb-4">
              <li>адрес электронной почты;</li>
              <li>имя пользователя (при наличии);</li>
              <li>хешированный пароль (при регистрации через email);</li>
              <li>аватар (при наличии).</li>
            </ul>

            <h3 className="text-lg font-medium mb-3 text-white">3.1.2. Данные авторизации через OAuth:</h3>
            <ul className="list-disc list-inside text-zinc-300 space-y-1 mb-4">
              <li>идентификатор аккаунта Google и/или GitHub;</li>
              <li>публичный адрес электронной почты;</li>
              <li>имя профиля;</li>
              <li>аватар профиля.</li>
            </ul>

            <h3 className="text-lg font-medium mb-3 text-white">3.1.3. Данные об использовании Сервиса:</h3>
            <ul className="list-disc list-inside text-zinc-300 space-y-1 mb-4">
              <li>история созданных проектов и их содержание;</li>
              <li>загруженные изображения;</li>
              <li>текстовые запросы к системам искусственного интеллекта;</li>
              <li>действия в рамках Сервиса (создание, редактирование, удаление проектов).</li>
            </ul>

            <h3 className="text-lg font-medium mb-3 text-white">3.1.4. Платёжные данные:</h3>
            <ul className="list-disc list-inside text-zinc-300 space-y-1 mb-4">
              <li>история транзакций (дата, сумма, тариф);</li>
              <li>информация о приобретённых кредитах и тарифах;</li>
              <li>статус платежей.</li>
            </ul>
            <p className="text-zinc-300 mb-4 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
              <strong>Примечание:</strong> Данные банковских карт (номер, CVV, срок действия) <strong>не хранятся на серверах Оператора</strong>. Обработка платёжных данных карт осуществляется исключительно платёжной системой ЮKassa (ООО «ЮМани») в соответствии со стандартом безопасности PCI DSS.
            </p>

            <h3 className="text-lg font-medium mb-3 text-white">3.1.5. Технические данные:</h3>
            <ul className="list-disc list-inside text-zinc-300 space-y-1 mb-4">
              <li>IP-адрес;</li>
              <li>тип и версия браузера;</li>
              <li>операционная система;</li>
              <li>разрешение экрана;</li>
              <li>дата и время доступа;</li>
              <li>страницы, посещённые в рамках Сервиса;</li>
              <li>источник перехода (referrer).</li>
            </ul>

            <h3 className="text-lg font-medium mb-3 text-white">3.1.6. Файлы cookie:</h3>
            <ul className="list-disc list-inside text-zinc-300 space-y-1 mb-4">
              <li>сессионные файлы cookie для поддержания авторизации;</li>
              <li>функциональные cookie для сохранения пользовательских настроек;</li>
              <li>аналитические cookie для сбора статистики использования Сервиса.</li>
            </ul>
            <p className="text-zinc-300 mb-4">Подробнее о cookie — в разделе 10 настоящей Политики.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">4. Цели обработки персональных данных</h2>
            <p className="text-zinc-300 mb-4">4.1. Оператор обрабатывает персональные данные в следующих целях:</p>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-zinc-300 text-sm border-collapse">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-left p-2 font-semibold text-white">Цель обработки</th>
                    <th className="text-left p-2 font-semibold text-white">Категории данных</th>
                    <th className="text-left p-2 font-semibold text-white">Правовое основание</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-zinc-800"><td className="p-2">Регистрация и аутентификация</td><td className="p-2">Данные учётной записи, OAuth</td><td className="p-2">Согласие, исполнение договора</td></tr>
                  <tr className="border-b border-zinc-800"><td className="p-2">Предоставление доступа к функциям Сервиса</td><td className="p-2">Данные учётной записи, данные использования</td><td className="p-2">Исполнение договора (оферты)</td></tr>
                  <tr className="border-b border-zinc-800"><td className="p-2">Обработка платежей</td><td className="p-2">Платёжные данные</td><td className="p-2">Исполнение договора</td></tr>
                  <tr className="border-b border-zinc-800"><td className="p-2">Формирование чеков (422-ФЗ)</td><td className="p-2">Email, данные платежа</td><td className="p-2">Исполнение требований законодательства</td></tr>
                  <tr className="border-b border-zinc-800"><td className="p-2">Обработка запросов к ИИ</td><td className="p-2">Текстовые запросы, данные проектов</td><td className="p-2">Исполнение договора</td></tr>
                  <tr className="border-b border-zinc-800"><td className="p-2">Техническая поддержка</td><td className="p-2">Данные учётной записи, данные использования</td><td className="p-2">Исполнение договора</td></tr>
                  <tr className="border-b border-zinc-800"><td className="p-2">Улучшение качества Сервиса</td><td className="p-2">Технические данные, cookie</td><td className="p-2">Законный интерес Оператора</td></tr>
                  <tr className="border-b border-zinc-800"><td className="p-2">Предотвращение мошенничества</td><td className="p-2">Технические данные, данные учётной записи</td><td className="p-2">Законный интерес Оператора</td></tr>
                  <tr className="border-b border-zinc-800"><td className="p-2">Уведомления о состоянии аккаунта</td><td className="p-2">Email</td><td className="p-2">Исполнение договора</td></tr>
                  <tr className="border-b border-zinc-800"><td className="p-2">Уведомления об изменении условий</td><td className="p-2">Email</td><td className="p-2">Исполнение требований законодательства</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-zinc-300 mb-4">
              4.2. Оператор <strong>не обрабатывает</strong> персональные данные в целях, не указанных в настоящей Политике, без дополнительного согласия Пользователя.
            </p>
            <p className="text-zinc-300 mb-4">
              4.3. Оператор <strong>не осуществляет</strong> рассылку рекламных сообщений без отдельного явного согласия Пользователя.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">5. Правовые основания обработки</h2>
            <p className="text-zinc-300 mb-4">5.1. Обработка персональных данных осуществляется на основании:</p>
            <ul className="list-disc list-inside text-zinc-300 space-y-3 mb-4">
              <li><strong>Согласия субъекта персональных данных</strong> (п. 1 ч. 1 ст. 6 Федерального закона от 27.07.2006 № 152-ФЗ) — согласие предоставляется при регистрации в Сервисе путём проставления соответствующей отметки (чекбокса).</li>
              <li><strong>Исполнения договора</strong> (п. 5 ч. 1 ст. 6 Федерального закона от 27.07.2006 № 152-ФЗ) — обработка необходима для исполнения публичной оферты (договора), стороной которого является Пользователь.</li>
              <li><strong>Законных интересов Оператора</strong> (п. 7 ч. 1 ст. 6 Федерального закона от 27.07.2006 № 152-ФЗ) — обработка необходима для обеспечения безопасности Сервиса и улучшения его качества, при условии, что это не нарушает права и свободы субъекта персональных данных.</li>
              <li><strong>Исполнения требований законодательства</strong> — обработка необходима для соблюдения требований налогового законодательства (формирование чеков, 422-ФЗ), а также по запросам уполномоченных государственных органов.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">6. Хранение персональных данных</h2>
            <p className="text-zinc-300 mb-4">
              6.1. Персональные данные Пользователей хранятся на защищённых серверах хостинг-провайдера <strong>Timeweb</strong> (ООО «Таймвэб», ОГРН 1157847425498), расположенных на территории <strong>Российской Федерации</strong> (г. Санкт-Петербург), в соответствии с требованиями Федерального закона от 21.07.2014 № 242-ФЗ о локализации баз данных персональных данных граждан Российской Федерации.
            </p>
            <p className="text-zinc-300 mb-4">6.2. Сроки хранения персональных данных:</p>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-zinc-300 text-sm border-collapse">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-left p-2 font-semibold text-white">Категория данных</th>
                    <th className="text-left p-2 font-semibold text-white">Срок хранения</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-zinc-800"><td className="p-2">Данные учётной записи</td><td className="p-2">До удаления учётной записи Пользователем + 30 дней на техническое удаление</td></tr>
                  <tr className="border-b border-zinc-800"><td className="p-2">История проектов и загруженный контент</td><td className="p-2">До удаления проекта или учётной записи</td></tr>
                  <tr className="border-b border-zinc-800"><td className="p-2">Платёжная информация (история транзакций)</td><td className="p-2">В течение срока, установленного налоговым законодательством РФ (не менее 5 лет)</td></tr>
                  <tr className="border-b border-zinc-800"><td className="p-2">Технические логи (IP, браузер, время)</td><td className="p-2">До 12 месяцев</td></tr>
                  <tr className="border-b border-zinc-800"><td className="p-2">Cookie-файлы</td><td className="p-2">Сессионные — до закрытия браузера; постоянные — до 12 месяцев</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-zinc-300 mb-4">
              6.3. По истечении сроков хранения или при достижении целей обработки персональные данные уничтожаются или обезличиваются.
            </p>
            <p className="text-zinc-300 mb-4">6.4. При удалении учётной записи Пользователем:</p>
            <ul className="list-disc list-inside text-zinc-300 space-y-1 mb-4">
              <li>данные учётной записи и проекты удаляются в течение 30 (тридцати) календарных дней;</li>
              <li>платёжная информация сохраняется на срок, установленный законодательством;</li>
              <li>технические логи удаляются в обычном порядке (до 12 месяцев).</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">7. Передача данных третьим лицам</h2>
            <p className="text-zinc-300 mb-4">7.1. Оператор может передавать персональные данные следующим категориям получателей исключительно для целей, указанных в разделе 4 настоящей Политики:</p>

            <h3 className="text-lg font-medium mb-3 text-white">7.1.1. Платёжная система ЮKassa (ООО «ЮМани»)</h3>
            <ul className="list-disc list-inside text-zinc-300 space-y-1 mb-4">
              <li><strong>Цель:</strong> Обработка платежей.</li>
              <li><strong>Передаваемые данные:</strong> Email, данные о транзакции.</li>
              <li><strong>Местонахождение:</strong> Российская Федерация.</li>
              <li><strong>Основание:</strong> Исполнение договора.</li>
            </ul>

            <h3 className="text-lg font-medium mb-3 text-white">7.1.2. Хостинг-провайдер Timeweb (ООО «Таймвэб»)</h3>
            <ul className="list-disc list-inside text-zinc-300 space-y-1 mb-4">
              <li><strong>Цель:</strong> Хранение и обработка данных, обеспечение работы Сервиса.</li>
              <li><strong>Передаваемые данные:</strong> Все категории данных (хранение на серверах).</li>
              <li><strong>Местонахождение:</strong> Российская Федерация (г. Санкт-Петербург).</li>
              <li><strong>Основание:</strong> Исполнение договора.</li>
            </ul>

            <h3 className="text-lg font-medium mb-3 text-white">7.1.3. Поставщик ИИ-технологий — OpenRouter (OpenRouter, Inc.)</h3>
            <ul className="list-disc list-inside text-zinc-300 space-y-1 mb-4">
              <li><strong>Цель:</strong> Обработка текстовых запросов для генерации контента.</li>
              <li><strong>Передаваемые данные:</strong> Текстовые запросы Пользователей и содержимое проектов, направляемые на генерацию.</li>
              <li><strong>Местонахождение:</strong> Серверы могут располагаться за пределами Российской Федерации (США и другие страны).</li>
            </ul>
            <p className="text-zinc-300 mb-4"><strong>Меры защиты при трансграничной передаче:</strong></p>
            <ul className="list-disc list-inside text-zinc-300 space-y-1 mb-4">
              <li>Данные, передаваемые на обработку, <strong>не содержат прямых идентификаторов</strong> Пользователя (ФИО, email, телефон, IP-адрес не включаются в запросы к ИИ).</li>
              <li>Передаются исключительно: текст запроса и/или существующий код проекта для обработки.</li>
              <li>Передача осуществляется по зашифрованному каналу (TLS/SSL).</li>
              <li>OpenRouter не использует данные запросов для обучения своих моделей (согласно условиям использования OpenRouter).</li>
            </ul>
            <p className="text-zinc-300 mb-4">
              <strong>Правовое основание трансграничной передачи:</strong> Согласие субъекта персональных данных (ст. 12 Федерального закона от 27.07.2006 № 152-ФЗ), предоставленное при акцепте Оферты и настоящей Политики. Пользователь, используя функции генерации ИИ, осознанно направляет свои запросы на обработку.
            </p>

            <h3 className="text-lg font-medium mb-3 text-white">7.1.4. Аналитические сервисы</h3>
            <ul className="list-disc list-inside text-zinc-300 space-y-1 mb-4">
              <li><strong>Цель:</strong> Анализ использования Сервиса, улучшение качества.</li>
              <li><strong>Передаваемые данные:</strong> Обезличенные технические данные (cookie, данные о посещениях).</li>
              <li><strong>Местонахождение:</strong> Может варьироваться.</li>
              <li><strong>Основание:</strong> Законный интерес Оператора.</li>
            </ul>

            <p className="text-zinc-300 mb-4">7.2. Оператор <strong>не продаёт</strong> персональные данные третьим лицам.</p>
            <p className="text-zinc-300 mb-4">7.3. Оператор <strong>не передаёт</strong> персональные данные третьим лицам для маркетинговых целей без отдельного согласия Пользователя.</p>
            <p className="text-zinc-300 mb-4">7.4. Оператор может быть обязан раскрыть персональные данные по законному требованию уполномоченных государственных органов Российской Федерации в порядке и на основаниях, предусмотренных законодательством.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">8. Права Пользователя (субъекта персональных данных)</h2>
            <p className="text-zinc-300 mb-4">8.1. В соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ Пользователь имеет право:</p>
            <p className="text-zinc-300 mb-2">8.1.1. <strong>Получить информацию</strong> об обработке своих персональных данных, включая: подтверждение факта обработки, правовые основания, цели, способы обработки, наименование и место нахождения Оператора.</p>
            <p className="text-zinc-300 mb-2">8.1.2. <strong>Получить доступ</strong> к своим персональным данным, включая получение копии обрабатываемых данных.</p>
            <p className="text-zinc-300 mb-2">8.1.3. <strong>Требовать исправления</strong> неточных, неполных или неактуальных персональных данных.</p>
            <p className="text-zinc-300 mb-2">8.1.4. <strong>Требовать удаления</strong> своих персональных данных (право на забвение). При реализации данного права Оператор удаляет данные в течение <strong>30 (тридцати) календарных дней</strong>, за исключением данных, хранение которых предусмотрено законодательством (например, данные о транзакциях — не менее 5 лет).</p>
            <p className="text-zinc-300 mb-2">8.1.5. <strong>Требовать ограничения обработки</strong> персональных данных в случаях, предусмотренных законодательством.</p>
            <p className="text-zinc-300 mb-2">8.1.6. <strong>Получить свои данные</strong> в структурированном, машиночитаемом формате (право на переносимость данных).</p>
            <p className="text-zinc-300 mb-2">8.1.7. <strong>Отозвать согласие</strong> на обработку персональных данных. Отзыв согласия может повлечь невозможность использования Сервиса. Отзыв не влияет на законность обработки, осуществлявшейся до отзыва.</p>
            <p className="text-zinc-300 mb-4">8.1.8. <strong>Обжаловать</strong> действия или бездействие Оператора в Роскомнадзор (Федеральная служба по надзору в сфере связи, информационных технологий и массовых коммуникаций) или в суд.</p>
            <p className="text-zinc-300 mb-4">
              8.2. Для реализации указанных прав Пользователь направляет запрос на адрес: <a href="mailto:selenium.studio.web@gmail.com" className="text-indigo-400 hover:text-indigo-300">selenium.studio.web@gmail.com</a>
            </p>
            <p className="text-zinc-300 mb-4">
              8.3. Оператор обязан ответить на запрос Пользователя в течение <strong>30 (тридцати) календарных дней</strong> с момента получения запроса. Срок может быть продлён, если запрос требует проверки, с уведомлением Пользователя о причинах продления.
            </p>
            <p className="text-zinc-300 mb-4">
              8.4. Оператор вправе запросить у Пользователя подтверждение личности перед обработкой запроса для предотвращения несанкционированного доступа к персональным данным.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">9. Безопасность персональных данных</h2>
            <p className="text-zinc-300 mb-4">
              9.1. Оператор принимает необходимые организационные и технические меры для защиты персональных данных от неправомерного или случайного доступа, уничтожения, изменения, блокирования, копирования, распространения, а также от иных неправомерных действий третьих лиц.
            </p>
            <p className="text-zinc-300 mb-4">9.2. Применяемые меры безопасности включают:</p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
              <li><strong>Шифрование данных при передаче</strong> — все данные передаются по протоколу TLS/SSL (HTTPS).</li>
              <li><strong>Хеширование паролей</strong> — пароли хранятся в хешированном виде с использованием алгоритма bcrypt.</li>
              <li><strong>Регулярное резервное копирование</strong> данных.</li>
              <li><strong>Ограничение доступа</strong> — доступ к персональным данным имеет только Оператор.</li>
              <li><strong>Мониторинг</strong> подозрительной активности и попыток несанкционированного доступа.</li>
              <li><strong>Обновление программного обеспечения</strong> и устранение известных уязвимостей.</li>
            </ul>
            <p className="text-zinc-300 mb-4">
              9.3. Несмотря на принимаемые меры, Оператор не может гарантировать абсолютную защиту данных от всех возможных угроз.
            </p>
            <p className="text-zinc-300 mb-4">9.4. В случае инцидента безопасности (утечки персональных данных) Оператор:</p>
            <ul className="list-disc list-inside text-zinc-300 space-y-1 mb-4">
              <li>предпринимает меры по устранению последствий инцидента;</li>
              <li>уведомляет Роскомнадзор в течение 24 часов с момента обнаружения инцидента;</li>
              <li>уведомляет затронутых Пользователей в течение 72 часов с момента обнаружения инцидента.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">10. Файлы cookie</h2>
            <p className="text-zinc-300 mb-4">
              10.1. Сервис использует файлы cookie — небольшие текстовые файлы, размещаемые на устройстве Пользователя при посещении Сервиса.
            </p>
            <p className="text-zinc-300 mb-4">10.2. Типы используемых cookie:</p>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-zinc-300 text-sm border-collapse">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="text-left p-2 font-semibold text-white">Тип cookie</th>
                    <th className="text-left p-2 font-semibold text-white">Назначение</th>
                    <th className="text-left p-2 font-semibold text-white">Срок хранения</th>
                    <th className="text-left p-2 font-semibold text-white">Обязательность</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-zinc-800"><td className="p-2">Сессионные (строго необходимые)</td><td className="p-2">Поддержание авторизации, корректная работа Сервиса</td><td className="p-2">До закрытия браузера</td><td className="p-2">Обязательные</td></tr>
                  <tr className="border-b border-zinc-800"><td className="p-2">Функциональные</td><td className="p-2">Сохранение пользовательских настроек (тема, язык)</td><td className="p-2">До 12 месяцев</td><td className="p-2">Необязательные</td></tr>
                  <tr className="border-b border-zinc-800"><td className="p-2">Аналитические</td><td className="p-2">Сбор агрегированной статистики использования Сервиса</td><td className="p-2">До 12 месяцев</td><td className="p-2">Необязательные</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-zinc-300 mb-4">
              10.3. При первом посещении Сервиса Пользователю отображается уведомление (баннер) об использовании файлов cookie с возможностью: принять все cookie; принять только строго необходимые cookie; ознакомиться с подробной информацией.
            </p>
            <p className="text-zinc-300 mb-4">
              10.4. Строго необходимые (сессионные) cookie устанавливаются без согласия Пользователя, так как они необходимы для работы Сервиса. Функциональные и аналитические cookie устанавливаются только с согласия Пользователя.
            </p>
            <p className="text-zinc-300 mb-4">
              10.5. Пользователь может в любое время удалить cookie через настройки своего браузера. Удаление cookie может привести к ограничению функциональности Сервиса (необходимость повторной авторизации).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">11. Обработка данных несовершеннолетних</h2>
            <p className="text-zinc-300 mb-4">
              11.1. Сервис не предназначен для лиц младше <strong>14 (четырнадцати) лет</strong>. Оператор сознательно не собирает персональные данные лиц младше 14 лет.
            </p>
            <p className="text-zinc-300 mb-4">
              11.2. Лица в возрасте от 14 до 18 лет вправе использовать Сервис с согласия своих законных представителей (родителей, опекунов).
            </p>
            <p className="text-zinc-300 mb-4">
              11.3. Если Оператору станет известно, что были собраны персональные данные лица младше 14 лет без согласия законного представителя, такие данные будут незамедлительно удалены.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">12. Трансграничная передача персональных данных</h2>
            <p className="text-zinc-300 mb-4">
              12.1. В связи с использованием сервиса OpenRouter для обработки запросов к ИИ, часть данных может передаваться за пределы Российской Федерации.
            </p>
            <p className="text-zinc-300 mb-4">
              12.2. Трансграничная передача осуществляется в соответствии со статьёй 12 Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных» на основании согласия субъекта персональных данных, предоставленного при акцепте Оферты и настоящей Политики.
            </p>
            <p className="text-zinc-300 mb-4">12.3. При трансграничной передаче Оператор обеспечивает:</p>
            <ul className="list-disc list-inside text-zinc-300 space-y-1 mb-4">
              <li>передачу данных по зашифрованным каналам (TLS/SSL);</li>
              <li>минимизацию передаваемых данных (передаются только текстовые запросы и код проектов; прямые персональные идентификаторы — email, ФИО, IP-адрес — <strong>не включаются</strong> в запросы к ИИ);</li>
              <li>контроль за объёмом и характером передаваемых данных.</li>
            </ul>
            <p className="text-zinc-300 mb-4">
              12.4. Перед использованием функций генерации ИИ Пользователь самостоятельно принимает решение о содержании своих запросов. Оператор рекомендует <strong>не включать</strong> в текстовые запросы к ИИ персональные данные третьих лиц, конфиденциальную информацию и коммерческую тайну.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">13. Изменения в Политике конфиденциальности</h2>
            <p className="text-zinc-300 mb-4">
              13.1. Оператор оставляет за собой право вносить изменения в настоящую Политику.
            </p>
            <p className="text-zinc-300 mb-4">
              13.2. Новая редакция Политики вступает в силу с момента её размещения на сайте moonely.ru, если иной срок не указан в тексте обновлённой Политики.
            </p>
            <p className="text-zinc-300 mb-4">
              13.3. О существенных изменениях Оператор уведомляет Пользователей по электронной почте и/или через уведомление в Сервисе.
            </p>
            <p className="text-zinc-300 mb-4">
              13.4. Продолжение использования Сервиса после вступления в силу изменений означает согласие Пользователя с обновлённой Политикой. Если Пользователь не согласен с изменениями, он вправе прекратить использование Сервиса и удалить свою учётную запись.
            </p>
            <p className="text-zinc-300 mb-4">
              13.5. Предыдущие версии Политики хранятся Оператором и могут быть предоставлены Пользователю по запросу.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">14. Контакты</h2>
            <p className="text-zinc-300 mb-4">По всем вопросам, связанным с обработкой и защитой персональных данных, обращайтесь:</p>
            <p className="text-zinc-300 mb-2"><strong>Земсков Михаил Олегович</strong></p>
            <p className="text-zinc-300 mb-2">Email: <a href="mailto:selenium.studio.web@gmail.com" className="text-indigo-400 hover:text-indigo-300">selenium.studio.web@gmail.com</a></p>
            <p className="text-zinc-300">Адрес Сервиса: <a href="https://moonely.ru" className="text-indigo-400 hover:text-indigo-300">https://moonely.ru</a></p>
          </section>
        </div>
      </main>
    </div>
  );
}
