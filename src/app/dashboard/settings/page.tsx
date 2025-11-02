
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");

  const handleSave = () => {
    // Lógica para salvar será implementada futuramente
    console.log("Saving settings:", { telegramToken, telegramChatId });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as preferências e configurações da sua conta.
        </p>
      </div>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Granor IA</CardTitle>
            <CardDescription>
              Libere todo o potencial da inteligência artificial para automatizar o registro de despesas e receitas, gerar relatórios e obter informações valiosas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="telegram-token">Token BOT Telegram</Label>
                <Input
                  id="telegram-token"
                  type="password"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  placeholder="Cole seu token aqui"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telegram-chat-id">ID Chat Bot Telegram</Label>
                <Input
                  id="telegram-chat-id"
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="Cole o ID do seu chat aqui"
                />
              </div>
              <Button type="submit">Salvar</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
