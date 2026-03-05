import Link from "next/link";
import { Code2, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  return (
    <footer className={cn("w-full bg-zinc-950 py-12 px-4 md:px-6 mt-12 md:mt-16", className)}>
      <div className="container mx-auto max-w-full px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white mb-4">
              <img src="/logo.svg" alt="Moonely" className="h-8 w-8" />
              <span>Moonely</span>
            </Link>
            <p className="text-sm text-gray-400 mb-4">
              Конструктор сайтов на ИИ.
              <br />
              Готовый сайт за 60 секунд.
            </p>
          </div>

          {/* Product Column */}
          <div className="col-span-1">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Продукт
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Новый проект
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Тарифы
                </Link>
              </li>
              <li>
                <Link href="/templates" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Шаблоны
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div className="col-span-1">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Правовая информация
            </h3>
            <ul className="space-y-3">
              <li>
                <Link href="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Политика конфиденциальности
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">
                  Оферта
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Column */}
          <div className="col-span-1">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Контакты
            </h3>
            <ul className="space-y-3">
              <li>
                <a 
                  href="mailto:selenium.studio.web@gmail.com" 
                  className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  selenium.studio.web@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 md:border-white/15 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Moonely. Все права защищены.
          </p>
        </div>
      </div>
    </footer>
  );
}
