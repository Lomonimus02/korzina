import { Metadata } from "next";
import Link from "next/link";
import { Code2, ArrowLeft } from "lucide-react";

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
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white">
              <Code2 className="h-5 w-5" />
            </div>
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

        <h1 className="text-3xl md:text-4xl font-bold mb-8">Политика конфиденциальности</h1>
        
        <div className="prose prose-invert prose-zinc max-w-none">
          <p className="text-zinc-400 mb-8">
            Дата вступления в силу: 1 декабря 2024 года
            <br />
            Последнее обновление: 22 декабря 2024 года
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">1. Общие положения</h2>
            <p className="text-zinc-300 mb-4">
              Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок обработки и защиты персональных данных пользователей сервиса Moonely (далее — «Сервис»), расположенного по адресу moonely.ru.
            </p>
            <p className="text-zinc-300 mb-4">
              Используя Сервис, вы подтверждаете, что ознакомились с данной Политикой и согласны с её условиями. Если вы не согласны с условиями Политики, пожалуйста, не используйте Сервис.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">2. Оператор персональных данных</h2>
            <p className="text-zinc-300 mb-4">
              Оператором персональных данных является администрация сервиса Moonely.
            </p>
            <p className="text-zinc-300 mb-4">
              Контактный email для вопросов о персональных данных: <a href="mailto:selenium.studio.web@gmail.com" className="text-indigo-400 hover:text-indigo-300">selenium.studio.web@gmail.com</a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">3. Собираемые данные</h2>
            <p className="text-zinc-300 mb-4">
              Мы собираем следующие категории персональных данных:
            </p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
              <li><strong>Данные учётной записи:</strong> адрес электронной почты, имя пользователя (при наличии), хешированный пароль</li>
              <li><strong>Данные об использовании:</strong> история созданных проектов, загруженные изображения, текстовые запросы к ИИ</li>
              <li><strong>Платёжные данные:</strong> история транзакций, приобретённые тарифы и кредиты (данные карт не хранятся на наших серверах)</li>
              <li><strong>Технические данные:</strong> IP-адрес, тип браузера, операционная система, время доступа</li>
              <li><strong>Данные авторизации через OAuth:</strong> идентификатор аккаунта Google/GitHub, публичный email и имя профиля</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">4. Цели обработки данных</h2>
            <p className="text-zinc-300 mb-4">
              Персональные данные обрабатываются в следующих целях:
            </p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
              <li>Предоставление доступа к функциям Сервиса</li>
              <li>Идентификация и аутентификация пользователей</li>
              <li>Обработка платежей и управление подписками</li>
              <li>Техническая поддержка пользователей</li>
              <li>Улучшение качества Сервиса и разработка новых функций</li>
              <li>Предотвращение мошенничества и обеспечение безопасности</li>
              <li>Отправка уведомлений о состоянии аккаунта и важных изменениях</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">5. Правовые основания обработки</h2>
            <p className="text-zinc-300 mb-4">
              Обработка персональных данных осуществляется на основании:
            </p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
              <li>Согласия пользователя (ст. 6 ФЗ «О персональных данных»)</li>
              <li>Исполнения договора (оферты) на предоставление услуг</li>
              <li>Законных интересов оператора по обеспечению безопасности Сервиса</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">6. Хранение данных</h2>
            <p className="text-zinc-300 mb-4">
              Персональные данные хранятся на защищённых серверах с использованием современных методов шифрования. Срок хранения данных:
            </p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
              <li>Данные учётной записи — до удаления аккаунта пользователем</li>
              <li>История проектов — до удаления аккаунта или самих проектов</li>
              <li>Платёжная информация — в течение срока, требуемого законодательством (не менее 5 лет)</li>
              <li>Технические логи — до 12 месяцев</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">7. Передача данных третьим лицам</h2>
            <p className="text-zinc-300 mb-4">
              Мы можем передавать данные следующим категориям получателей:
            </p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
              <li><strong>Платёжные системы:</strong> для обработки платежей (YooKassa, банки-эквайеры)</li>
              <li><strong>Облачные провайдеры:</strong> для хостинга и хранения данных</li>
              <li><strong>Провайдеры ИИ:</strong> для обработки текстовых запросов (данные анонимизируются)</li>
              <li><strong>Аналитические сервисы:</strong> для улучшения качества Сервиса</li>
            </ul>
            <p className="text-zinc-300 mb-4">
              Мы не продаём персональные данные третьим лицам.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">8. Права пользователей</h2>
            <p className="text-zinc-300 mb-4">
              Вы имеете право:
            </p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
              <li>Получить информацию о своих персональных данных</li>
              <li>Исправить неточные данные</li>
              <li>Удалить свои данные (право на забвение)</li>
              <li>Ограничить обработку данных</li>
              <li>Получить копию своих данных в машиночитаемом формате</li>
              <li>Отозвать согласие на обработку данных</li>
            </ul>
            <p className="text-zinc-300 mb-4">
              Для реализации своих прав обратитесь по адресу: <a href="mailto:selenium.studio.web@gmail.com" className="text-indigo-400 hover:text-indigo-300">selenium.studio.web@gmail.com</a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">9. Файлы cookie</h2>
            <p className="text-zinc-300 mb-4">
              Сервис использует файлы cookie для:
            </p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
              <li>Поддержания сессии авторизации</li>
              <li>Сохранения пользовательских настроек</li>
              <li>Сбора аналитики об использовании Сервиса</li>
            </ul>
            <p className="text-zinc-300 mb-4">
              Вы можете отключить cookie в настройках браузера, однако это может ограничить функциональность Сервиса.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">10. Безопасность данных</h2>
            <p className="text-zinc-300 mb-4">
              Мы применяем следующие меры безопасности:
            </p>
            <ul className="list-disc list-inside text-zinc-300 space-y-2 mb-4">
              <li>Шифрование данных при передаче (TLS/SSL)</li>
              <li>Хеширование паролей с использованием bcrypt</li>
              <li>Регулярное резервное копирование</li>
              <li>Ограничение доступа сотрудников к персональным данным</li>
              <li>Мониторинг подозрительной активности</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">11. Изменения в Политике</h2>
            <p className="text-zinc-300 mb-4">
              Мы оставляем за собой право вносить изменения в настоящую Политику. При существенных изменениях мы уведомим пользователей по электронной почте или через уведомление в Сервисе.
            </p>
            <p className="text-zinc-300 mb-4">
              Продолжение использования Сервиса после внесения изменений означает ваше согласие с обновлённой Политикой.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">12. Контакты</h2>
            <p className="text-zinc-300 mb-4">
              По всем вопросам, связанным с обработкой персональных данных, обращайтесь:
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
