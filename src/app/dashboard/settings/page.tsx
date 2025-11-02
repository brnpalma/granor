
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getUserPreferences, updateUserPreferences } from "@/lib/firestore";
import type { UserPreferences } from "@/lib/types";
import { Sparkles } from "lucide-react";

export default function SettingsPage() {
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user?.uid) {
      setIsLoading(true);
      const unsubscribe = getUserPreferences(user.uid, (prefs) => {
        setTelegramToken(prefs.telegramToken || "");
        setTelegramChatId(prefs.telegramChatId || "");
        setIsLoading(false);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleSave = async () => {
    if (!user?.uid) {
      toast({ title: "Erro", description: "Você precisa estar logado para salvar.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      await updateUserPreferences(user.uid, { telegramToken, telegramChatId });
      toast({ title: "Sucesso!", description: "Configurações salvas.", variant: "success" });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast({ title: "Erro", description: "Não foi possível salvar as configurações.", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
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
            <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                <span>Granor IA</span>
            </CardTitle>
            <CardDescription>
              Libere todo o potencial da inteligência artificial para automatizar o registro de despesas e receitas, gerar relatórios e obter informações valiosas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <p>Carregando configurações...</p>
            ) : (
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
                  <Button type="submit" disabled={isSaving}>
                      {isSaving ? "Salvando..." : "Salvar"}
                  </Button>
                </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
