"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  // Поддержка обоих параметров: paymentId (новый ЮКасса) и orderId (старый)
  const paymentId = searchParams.get("paymentId") || searchParams.get("orderId");
  
  const [status, setStatus] = useState<"loading" | "success" | "pending" | "error">("loading");
  const [checkCount, setCheckCount] = useState(0);

  useEffect(() => {
    if (!paymentId) {
      setStatus("error");
      return;
    }

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/payment/check?paymentId=${paymentId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "PAID") {
            setStatus("success");
            return true;
          }
        }
      } catch (e) {
        console.error(e);
      }
      return false;
    };

    // Initial check
    checkStatus().then((isPaid) => {
      if (isPaid) return;

      // Poll every 3 seconds for 30 seconds (10 checks)
      let checks = 0;
      const interval = setInterval(async () => {
        checks++;
        setCheckCount(checks);
        const isPaid = await checkStatus();
        if (isPaid) {
          clearInterval(interval);
        }
        // After 10 checks (30 sec), show "pending" status
        if (checks >= 10 && !isPaid) {
          clearInterval(interval);
          setStatus("pending");
        }
      }, 3000);

      return () => clearInterval(interval);
    });
  }, [paymentId]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-center">
      {status === "loading" && (
        <div className="space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Проверяем оплату...</h1>
          <p className="text-zinc-400">Ожидаем подтверждение от ЮКассы ({checkCount}/10)</p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-4 animate-in fade-in zoom-in duration-500">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h1 className="text-3xl font-bold text-white">Оплата прошла успешно!</h1>
          <p className="text-zinc-400">100 кредитов зачислены на ваш счет. Вы теперь PRO!</p>
          <Button asChild className="mt-4 bg-white text-black hover:bg-zinc-200">
            <Link href="/new">Начать создавать</Link>
          </Button>
        </div>
      )}

      {status === "pending" && (
        <div className="space-y-4">
          <Clock className="h-16 w-16 text-yellow-500 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Обработка платежа</h1>
          <p className="text-zinc-400 max-w-md">
            Мы еще не получили подтверждение от ЮКассы. 
            Это может занять до 5 минут.
          </p>
          <div className="bg-zinc-900 rounded-lg p-4 mt-4 text-left max-w-md">
            <p className="text-sm text-zinc-300 mb-2">
              <strong>ID платежа:</strong> {paymentId}
            </p>
            <p className="text-xs text-zinc-500">
              Если деньги списались, но кредиты не появились в течение 10 минут, 
              напишите в Telegram: <a href="https://t.me/moonely_support" className="text-purple-400 hover:underline">@moonely_support</a>
            </p>
          </div>
          <div className="flex gap-3 mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setStatus("loading");
                setCheckCount(0);
                window.location.reload();
              }}
            >
              Проверить снова
            </Button>
            <Button asChild>
              <Link href="/account">Мой аккаунт</Link>
            </Button>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4">
          <XCircle className="h-16 w-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Ошибка</h1>
          <p className="text-zinc-400">Не удалось найти информацию о платеже.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/pricing">Вернуться к тарифам</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-purple-500 mx-auto" />
        <h1 className="text-2xl font-bold text-white">Загрузка...</h1>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
