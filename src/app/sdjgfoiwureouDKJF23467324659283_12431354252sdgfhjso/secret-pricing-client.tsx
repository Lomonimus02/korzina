"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Check } from "lucide-react";
import { useAnalytics } from "@/hooks/use-analytics";

export function SecretPricingClient() {
  const [isLoading, setIsLoading] = useState(false);
  const { trackClick } = useAnalytics();

  const handlePurchase = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/payment/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: "test_promo" }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          alert("Failed to get payment URL");
        }
      } else {
        alert("Payment initiation failed.");
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("Something went wrong.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-purple-500/50 bg-zinc-900/50 backdrop-blur-xl">
        <CardHeader>
          <div className="mb-2 inline-block rounded-full bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-400">
            SECRET TEST OFFER
          </div>
          <CardTitle className="text-2xl text-white">Тестовый Тариф</CardTitle>
          <CardDescription className="text-zinc-400">
            Специальный тариф для проверки платежной системы.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <span className="text-4xl font-bold text-white">2₽</span>
            <span className="text-zinc-500"> / единоразово</span>
          </div>
          <ul className="space-y-3 text-zinc-300">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-purple-400" />
              4 кредита
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-purple-400" />
              Проверка оплаты
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-purple-400" />
              Мгновенное зачисление
            </li>
          </ul>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full bg-purple-600 hover:bg-purple-700 text-white" 
            onClick={() => { trackClick("secret_test_purchase"); handlePurchase(); }}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Купить за 2₽
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
