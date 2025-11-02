
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
import { Bot, CheckCircle, HelpCircle } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import Link from "next/link";


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
        const testResponse = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: telegramChatId, text: welcomeMessage })
        });

        if (!testResponse.ok) {
            throw new Error("Não foi possível enviar a mensagem de teste. Verifique o Token e o ID do Chat.");
        }

        const webhookUrl = `https://granor.vercel.app/api/agent?userId=${user.uid}`;
        const encodedWebhookUrl = encodeURIComponent(webhookUrl);
        const setWebhookResponse = await fetch(`https://api.telegram.org/bot${telegramToken}/setWebhook?url=${encodedWebhookUrl}`);

        if (!setWebhookResponse.ok) {
            const errorData = await setWebhookResponse.json();
            throw new Error(`Falha ao configurar o webhook: ${errorData.description}`);
        }

        await updateUserPreferences(user.uid, { telegramToken, telegramChatId });
        setSavedTelegramToken(telegramToken);
        setSavedTelegramChatId(telegramChatId);
        toast({ title: "Sucesso!", description: "Configurações salvas, testadas e webhook registrado.", variant: "success" });

    } catch (error: any) {
        console.error("Failed to save settings:", error);
        toast({ 
            title: "Falha na Configuração", 
            description: error.message || "Ocorreu um erro. Por favor, tente novamente.", 
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
      await fetch(`https://api.telegram.org/bot${savedTelegramToken}/deleteWebhook`);

      await updateUserPreferences(user.uid, { telegramToken: "", telegramChatId: "" });
      setTelegramToken("");
      setTelegramChatId("");
      setSavedTelegramToken("");
      setSavedTelegramChatId("");
      toast({ title: "Sucesso!", description: "Configurações e webhook removidos.", variant: "success" });
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
            <div className="flex w-full items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                  <Bot className="h-6 w-6 text-yellow-500" />
                  <span>Granor IA</span>
              </CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="bg-yellow-400/20 text-yellow-500 hover:bg-yellow-400/30 hover:text-yellow-600">
                    <HelpCircle className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Como configurar o Telegram</DialogTitle>
                    <DialogDescription>
                      Siga os passos abaixo para integrar o Granor com seu Telegram.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 text-sm text-muted-foreground overflow-auto max-h-[60vh] p-1">
                    <div>
                      <h3 className="font-bold text-foreground mb-2">1. Como obter o Token do Bot</h3>
                      <ul className="list-decimal list-inside space-y-2">
                        <li>No Telegram, procure por <code className="bg-muted text-muted-foreground p-1 rounded-sm">@BotFather</code> e inicie uma conversa.</li>
                        <li>Digite o comando <code className="bg-muted text-muted-foreground p-1 rounded-sm">/newbot</code>.</li>
                        <li>Siga as instruções para dar um nome e um username para o seu bot.</li>
                        <li>Ao final, o BotFather enviará uma mensagem com o token. Copie este token e cole no campo "Token BOT Telegram".</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground mb-2">2. Como obter o ID do Chat</h3>
                      <ul className="list-decimal list-inside space-y-2">
                        <li>No Telegram, procure por <code className="bg-muted text-muted-foreground p-1 rounded-sm">@userinfobot</code> e inicie uma conversa.</li>
                        <li>O bot responderá imediatamente com o seu ID. Copie este número e cole no campo "ID Chat Bot Telegram".</li>
                        <li><strong>Importante:</strong> Após configurar, você precisa iniciar a conversa com o bot que você criou (enviando um <code className="bg-muted text-muted-foreground p-1 rounded-sm">/start</code> ou qualquer mensagem) para que ele possa te enviar notificações.</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground mb-2">3. Como obter o ID de um Grupo</h3>
                      <ul className="list-decimal list-inside space-y-2">
                        <li>Adicione o <code className="bg-muted text-muted-foreground p-1 rounded-sm">@userinfobot</code> ao seu grupo.</li>
                        <li>O bot enviará uma mensagem no grupo com o ID do chat do grupo. Ele começa com um sinal de menos (-).</li>
                        <li>Copie este ID (incluindo o sinal de menos) e cole no campo "ID Chat Bot Telegram".</li>
                      </ul>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
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
                    {savedTelegramToken && savedTelegramChatId && (
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
