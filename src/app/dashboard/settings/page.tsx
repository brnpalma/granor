
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
import { Sparkles, CheckCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [telegramToken, setTelegramToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [savedTelegramToken, setSavedTelegramToken] = useState("");
  const [savedTelegramChatId, setSavedTelegramChatId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user?.uid) {
      setIsLoading(true);
      const unsubscribe = getUserPreferences(user.uid, (prefs) => {
        const token = prefs.telegramToken || "";
        const chatId = prefs.telegramChatId || "";
        setTelegramToken(token);
        setTelegramChatId(chatId);
        setSavedTelegramToken(token);
        setSavedTelegramChatId(chatId);
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
        const welcomeMessage = "Olá! 👋 Sou o Granor, seu assistente financeiro. Suas configurações do Telegram foram conectadas com sucesso! Agora você pode me enviar suas transações por aqui.";
        const response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: telegramChatId, text: welcomeMessage })
        });

        if (!response.ok) {
            toast({ 
                title: "Falha na Comunicação", 
                description: "Não foi possível enviar a mensagem de teste. Por favor, verifique se o Token e o ID do Chat estão corretos e tente novamente.", 
                variant: "destructive" 
            });
            setIsSaving(false);
            return;
        }

        await updateUserPreferences(user.uid, { telegramToken, telegramChatId });
        setSavedTelegramToken(telegramToken);
        setSavedTelegramChatId(telegramChatId);
        toast({ title: "Sucesso!", description: "Configurações salvas e testadas.", variant: "success" });

    } catch (error) {
        console.error("Failed to save settings or send Telegram message:", error);
        toast({ 
            title: "Falha na Comunicação", 
            description: "Não foi possível enviar a mensagem de teste. Por favor, verifique se o Token e o ID do Chat estão corretos e tente novamente.", 
            variant: "destructive" 
        });
    } finally {
        setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!user?.uid) {
      toast({ title: "Erro", description: "Você precisa estar logado.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      await updateUserPreferences(user.uid, { telegramToken: "", telegramChatId: "" });
      setTelegramToken("");
      setTelegramChatId("");
      setSavedTelegramToken("");
      setSavedTelegramChatId("");
      toast({ title: "Sucesso!", description: "Configurações removidas.", variant: "success" });
    } catch (error) {
      console.error("Failed to remove settings:", error);
      toast({ title: "Erro", description: "Não foi possível remover as configurações.", variant: "destructive" });
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
              <>
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
                  <div className="flex w-full items-center gap-2">
                    <Button type="submit" disabled={isSaving || !telegramToken || !telegramChatId}>
                        {isSaving ? "Salvando..." : "Salvar"}
                    </Button>
                    {(savedTelegramToken && savedTelegramChatId) && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" type="button" disabled={isSaving}>
                            Remover
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação removerá permanentemente suas configurações do Telegram. Você poderá adicioná-las novamente mais tarde.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleRemove}>
                              Sim, remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                     {savedTelegramToken && savedTelegramChatId && (
                        <div className={cn("ml-auto flex items-center gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400")}>
                            <CheckCircle className="h-5 w-5" />
                            <span>Configurado</span>
                        </div>
                    )}
                  </div>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
