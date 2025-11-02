
import { NextResponse } from "next/server";
import { generateObject, generateText } from "ai";
import { Transaction, transactionSchema } from "@/lib/types";
import { agentSystemPrompt } from "@/ai/rules";
import { google } from "@ai-sdk/google";
import admin from "firebase-admin";
import { DateTime } from "luxon";

export async function OPTIONS() {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

async function getUserTelegramPrefs(userId: string): Promise<{ token: string, chatId: string }> {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
            }),
        });
    }

    const db = admin.firestore();
    const prefDocRef = db.collection("users").doc(userId).collection("preferences").doc('user');
    const docSnap = await prefDocRef.get();

    if (docSnap.exists) {
        const data = docSnap.data();
        return {
            token: data?.telegramToken || process.env.TELEGRAM_TOKEN || '',
            chatId: data?.telegramChatId || process.env.TELEGRAM_CHAT_ID || '',
        };
    }
    
    return {
        token: process.env.TELEGRAM_TOKEN || '',
        chatId: process.env.TELEGRAM_CHAT_ID || '',
    };
}


export async function POST(request: Request) {
    try {
        console.log("🚀 Recebido POST Granor AI!");

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const body = await request.json();

        console.log("👤 Id Usuario:", userId);
        console.log("📦 Corpo da requisição:", body);

        if (!userId || userId === "") {
            return NextResponse.json(
                { success: false, reply: "❌ Usuário não informado ou inválido." },
                { status: 400 }
            );
        }

        const { token: telegramToken, chatId: userChatId } = await getUserTelegramPrefs(userId);
        const chatId = body.message?.chat?.id ?? userChatId;

        // Send initial "Processing..." message
        if (telegramToken && chatId) {
            await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: "Processando...",
                }),
            });
        }
        
        const incomeMessage = body.message?.text ?? body.text ?? body.message ?? body;

        const mensagemUsuario = typeof incomeMessage === "string" 
            ? incomeMessage 
            : (incomeMessage.text ?? JSON.stringify(incomeMessage));
        
        var { text: jsonIA } = await generateText({
            model: google("models/gemini-2.5-flash"),
            system: agentSystemPrompt,
            prompt: mensagemUsuario,
        });
        
        console.log("🧪 Texto bruto da IA:", jsonIA);

        const { object } = await generateObject({
            model: google("models/gemini-2.5-flash"),
            system: agentSystemPrompt,
            schema: transactionSchema,
            prompt: mensagemUsuario,
        });
        
        if(!object.date){
            const spNow = DateTime.now().setZone("America/Sao_Paulo");
            object.date = spNow.toJSDate();
        }
        
        console.log("🧪 Objeto gerado pela IA:", object);
        
        if(object){
            if(object.iaDoubt){
                const doubtReply = `🤔 Dúvida: ${object.iaReply}`;
                 if (telegramToken && chatId) {
                    await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({   
                            chat_id: chatId,
                            text: doubtReply,
                        }),
                    });
                }
                return NextResponse.json(
                    { success: false, reply: doubtReply },
                    { status: 200 } // Respond 200 to Telegram to avoid retries
                );
            }

            await addTransactionServer(userId, object as Transaction);

            const tipoPtBr = object.type === "income" ? "Receita" 
                : object.type === "expense" ? "Despesa" 
                : object.type === "transfer" ? "Transferência" 
                : object.type === "credit_card_reversal" ? "Estorno de Cartão de Crédito" 
                : "Transação";

            const reply = `✅ ${tipoPtBr} de R$${object.amount} registrada na categoria ${object.category}.
                            \n\nSolicitação original: ${mensagemUsuario}
                            \n\nResposta do assistente: ${object.iaReply}`;

            if (telegramToken && chatId) {
                await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({   
                        chat_id: chatId,
                        text: reply,
                    }),
                });
            } else {
                console.log("⚠️ Token ou Chat ID do Telegram não configurados para o usuário.");
            }

            return NextResponse.json({ success: true, reply });
        }
        
        const errorMessage = jsonIA || "❌ Não foi possível entender a transação.";
        if (telegramToken && chatId) {
            await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({   
                    chat_id: chatId,
                    text: errorMessage,
                }),
            });
        }
        return NextResponse.json({ 
            success: false, 
            reply: errorMessage
        }, { status: 200 }); // Respond 200 to Telegram to avoid retries

    } catch (error: any) {
        console.error("❌ Erro ao processar a mensagem do agente:", error);
        
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const body = await request.json().catch(() => ({}));
        
        if (userId) {
            const { token: telegramToken, chatId: userChatId } = await getUserTelegramPrefs(userId).catch(() => ({ token: '', chatId: '' }));
            const chatId = body.message?.chat?.id ?? userChatId;

            if (telegramToken && chatId) {
                await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: `Ocorreu um erro no servidor: ${error.message}`,
                    }),
                });
            }
        }

        return NextResponse.json(
            { success: false, reply: error.message },
            { status: 500 }
        );
    }
}

export async function addTransactionServer(userId: string, transaction: Transaction) {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
            }),
        });
    }

    const db = admin.firestore();

    if (transaction.accountId) {
        const accountNameNormalized = normalizeName(transaction.accountId);

        const accountsSnapshot = await db
            .collection("users")
            .doc(userId)
            .collection("accounts")
            .get(); // pegar todas as contas do usuário

        // Encontrar a conta cujo name normalizado bate com o enviado pela IA
        const matchedAccount = accountsSnapshot.docs.find(doc => 
            normalizeName(doc.data().name) === accountNameNormalized
        );

        if (matchedAccount) {
            transaction.accountId = matchedAccount.id;
        }
        else{
            console.log(`⚠️ Conta não encontrada para o nome: ${transaction.accountId}`);
        }
    }

    const docRef = db.collection("users").doc(userId).collection("transactions").doc();
    await docRef.set({ ...transaction, id: docRef.id });
    return docRef.id;
}

function normalizeName(name: string): string {
  return name
    .normalize("NFD")               // separa letras e acentos
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-zA-Z0-9 ]/g, "")  // remove caracteres especiais
    .trim()
    .toLowerCase();                 // converte para minúsculas
}
