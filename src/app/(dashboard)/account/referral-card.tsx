"use client";

import { useState } from "react";
import { Users, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ReferralCard({
  referralCode,
  referralCount,
}: {
  referralCode: string;
  referralCount: number;
}) {
  const [copied, setCopied] = useState(false);
  const referralLink = `https://moonely.ru/register?ref=${referralCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement("textarea");
      textarea.value = referralLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Реферальная программа
        </CardTitle>
        <CardDescription>
          Приглашайте друзей по ссылке и получайте 10 бесплатных кредитов за каждую регистрацию!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-md border bg-muted/50 px-3 py-2 text-sm font-mono break-all select-all">
            {referralLink}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Приглашено друзей: <span className="font-semibold text-foreground">{referralCount}</span>
          </span>
          <span className="text-muted-foreground">
            Заработано кредитов: <span className="font-semibold text-foreground">{referralCount * 10}</span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
