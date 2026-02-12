/**
 * Типы для ЮКасса API v3
 * Документация: https://yookassa.ru/developers/api
 */

// ============================================
// Базовые типы
// ============================================

/**
 * Сумма платежа
 */
export interface YooKassaAmount {
  value: string;      // Сумма (строка с точкой, например "100.00")
  currency: string;   // Валюта (например "RUB")
}

/**
 * Подтверждение платежа (redirect)
 */
export interface YooKassaConfirmation {
  type: "redirect";           // Тип подтверждения
  return_url: string;         // URL для возврата после оплаты
  confirmation_url?: string;  // URL для перенаправления (в ответе)
}

/**
 * Метаданные платежа (произвольные данные)
 */
export interface YooKassaMetadata {
  userId: string;           // ID пользователя в нашей системе
  internalPaymentId: string; // Внутренний ID платежа
  plan?: string;            // Тарифный план
  [key: string]: string | undefined;
}

// ============================================
// Запросы к API
// ============================================

/**
 * Тело запроса на создание платежа
 * POST https://api.yookassa.ru/v3/payments
 */
export interface YooKassaCreatePaymentRequest {
  amount: YooKassaAmount;
  capture: boolean;           // true = одностадийный (сразу списывать)
  confirmation: {
    type: "redirect";
    return_url: string;
  };
  description: string;        // Описание платежа (видно в личном кабинете ЮКасса)
  metadata: YooKassaMetadata; // Наши данные для идентификации
  receipt?: YooKassaReceipt;  // Данные для чека (54-ФЗ) - опционально
}

/**
 * Данные чека (для 54-ФЗ)
 */
export interface YooKassaReceipt {
  customer: {
    email?: string;
    phone?: string;
  };
  items: YooKassaReceiptItem[];
}

export interface YooKassaReceiptItem {
  description: string;        // Название товара/услуги
  quantity: string;           // Количество
  amount: YooKassaAmount;     // Цена за единицу
  vat_code: number;           // Код НДС (1 = без НДС, 2 = 0%, 3 = 10%, 4 = 20%)
  payment_subject?: string;   // Признак предмета расчета (например "service")
  payment_mode?: string;      // Признак способа расчета (например "full_payment")
}

// ============================================
// Ответы от API
// ============================================

/**
 * Полный объект платежа от ЮКасса
 */
export interface YooKassaPayment {
  id: string;                     // ID платежа в системе ЮКасса
  status: YooKassaPaymentStatus;  // Статус платежа
  amount: YooKassaAmount;         // Сумма
  income_amount?: YooKassaAmount; // Сумма к получению (за вычетом комиссии)
  description?: string;           // Описание
  recipient: {
    account_id: string;           // ID магазина
    gateway_id: string;           // ID шлюза
  };
  payment_method?: YooKassaPaymentMethod;
  captured_at?: string;           // Дата и время списания
  created_at: string;             // Дата и время создания
  expires_at?: string;            // Дата истечения (для pending)
  confirmation?: YooKassaConfirmation;
  test: boolean;                  // Тестовый платеж
  refunded_amount?: YooKassaAmount;
  paid: boolean;                  // Признак оплаты
  refundable: boolean;            // Можно ли вернуть
  metadata?: YooKassaMetadata;    // Наши метаданные
  cancellation_details?: {
    party: string;                // Кто отменил
    reason: string;               // Причина отмены
  };
}

/**
 * Возможные статусы платежа
 */
export type YooKassaPaymentStatus =
  | "pending"            // Ожидает оплаты
  | "waiting_for_capture" // Ожидает подтверждения (двухстадийный)
  | "succeeded"          // Успешно оплачен
  | "canceled";          // Отменён

/**
 * Информация о способе оплаты
 */
export interface YooKassaPaymentMethod {
  type: string;           // Тип (bank_card, yoo_money, sbp, etc.)
  id: string;             // ID способа оплаты
  saved: boolean;         // Сохранён для повторных платежей
  title?: string;         // Название (например "Банковская карта")
  card?: {
    first6?: string;      // Первые 6 цифр карты
    last4: string;        // Последние 4 цифры
    expiry_month: string; // Месяц истечения
    expiry_year: string;  // Год истечения
    card_type: string;    // Тип карты (Visa, MasterCard, etc.)
    issuer_country?: string; // Страна эмитента
  };
}

// ============================================
// Webhook события
// ============================================

/**
 * Webhook уведомление от ЮКасса
 */
export interface YooKassaWebhookEvent {
  type: YooKassaWebhookEventType;
  event: YooKassaWebhookEventType;
  object: YooKassaPayment;
}

/**
 * Типы событий webhook
 */
export type YooKassaWebhookEventType =
  | "payment.succeeded"          // Платеж успешно завершён
  | "payment.waiting_for_capture" // Ожидает подтверждения
  | "payment.canceled"           // Платеж отменён
  | "refund.succeeded";          // Возврат успешно завершён

// ============================================
// Конфигурация тарифов
// ============================================

/**
 * Конфигурация тарифных планов
 */
export interface PlanConfig {
  amount: number;   // Цена в рублях
  credits: number;  // Количество кредитов
  name: string;     // Название плана
  description: string; // Описание для чека
}

/**
 * Карта тарифов
 */
export const YOOKASSA_PLANS: Record<string, PlanConfig> = {
  STARTER: {
    amount: 890,
    credits: 25,
    name: "Стартовый",
    description: "Подписка Moonely - Стартовый (25 генераций)",
  },
  ADVANCED: {
    amount: 2990,
    credits: 100,
    name: "Продвинутый",
    description: "Подписка Moonely - Продвинутый (100 генераций)",
  },
};

// ============================================
// Утилиты
// ============================================

/**
 * Форматирует сумму для API ЮКасса
 */
export function formatAmountForYooKassa(amount: number): YooKassaAmount {
  return {
    value: amount.toFixed(2),
    currency: "RUB",
  };
}

/**
 * Генерирует Idempotence-Key для запросов
 */
export function generateIdempotenceKey(): string {
  return crypto.randomUUID();
}

/**
 * Создаёт заголовок Basic Auth для ЮКасса
 */
export function createYooKassaAuthHeader(shopId: string, secretKey: string): string {
  const credentials = `${shopId}:${secretKey}`;
  const encoded = Buffer.from(credentials).toString("base64");
  return `Basic ${encoded}`;
}
