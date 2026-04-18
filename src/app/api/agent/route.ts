
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

async function initializeFirebaseAdmin() {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
            }),
        });
    }
    return admin.firestore();
}

async function getUserTelegramPrefs(userId: string): Promise<{ token: string, chatId: string }> {
    const db = await initializeFirebaseAdmin();
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

async function getConversationContext(userId: string, chatId: string): Promise<string> {
    const db = await initializeFirebaseAdmin();
    const contextRef = db.collection("users").doc(userId).collection("telegram_context").doc(chatId);
    const contextSnap = await contextRef.get();

    if (contextSnap.exists) {
        const data = contextSnap.data();
        if (data) {
            const historyTimestamp = data.timestamp?.toDate();
            // Check if context is older than 15 minutes
            if (historyTimestamp && (new Date().getTime() - historyTimestamp.getTime()) > 15 * 60 * 1000) {
                await contextRef.delete();
                return ""; // Context expired
            }
            return data.history || "";
        }
    }
    return "";
}

async function saveConversationContext(userId: string, chatId: string, history: string) {
    const db = await initializeFirebaseAdmin();
    const contextRef = db.collection("users").doc(userId).collection("telegram_context").doc(chatId);
    await contextRef.set({ 
        history,
        timestamp: admin.firestore.FieldValue.serverTimestamp() 
    });
}

async function clearContext(userId: string, chatId: string) {
    const db = await initializeFirebaseAdmin();
    const contextRef = db.collection("users").doc(userId).collection("telegram_context").doc(chatId);
    await contextRef.delete();
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
        const chatId = body.message?.chat?.id?.toString() ?? userChatId;
        
        const incomeMessage = body.message?.text ?? body.text ?? body.message ?? body;
        
        const currentUserMessage = typeof incomeMessage === "string" 
            ? incomeMessage 
            : (incomeMessage.text ?? JSON.stringify(incomeMessage));

        const normalizedMessage = currentUserMessage.trim().toLowerCase();
        if (normalizedMessage === 'cancelar' || normalizedMessage === 'limpar contexto') {
            await clearContext(userId, chatId);
            if (telegramToken && chatId) {
                await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: "Contexto anterior limpo. Vamos começar de novo!",
                    }),
                });
            }
            return NextResponse.json({ success: true, reply: "Contexto limpo." });
        }


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
        
        const previousContext = await getConversationContext(userId, chatId);
        const fullPrompt = previousContext ? `${previousContext}\n\nUsuário: ${currentUserMessage}` : currentUserMessage;
        
        console.log("📝 Prompt Completo para IA:", fullPrompt);

        const { object } = await generateObject({
            model: google("models/gemini-2.5-flash"),
            system: agentSystemPrompt,
            schema: transactionSchema,
            prompt: fullPrompt,
        });
        
        if(!object.date){
            const spNow = DateTime.now().setZone("America/Sao_Paulo");
            object.date = spNow.toJSDate();
        }
        
        if(object){
            console.log("🧪 Objeto gerado pela IA:", object);

            if(object.iaDoubt){
                const doubtReply = `🤔 Dúvida: ${object.iaReply}`;
                const newContext = `Contexto anterior: ${fullPrompt}\n\nDúvida da IA: ${object.iaReply}`;
                await saveConversationContext(userId, chatId, newContext);

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
            await clearContext(userId, chatId);

            const tipoPtBr = object.type === "income" ? "Receita" 
                : object.type === "expense" ? "Despesa" 
                : object.type === "transfer" ? "Transferência" 
                : object.type === "credit_card_reversal" ? "Estorno de Cartão de Crédito" 
                : "Transação";

            const reply = `✅ ${tipoPtBr} de R$${object.amount} registrada na categoria ${object.category}.
                            \n\nSolicitação original: ${currentUserMessage}
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
        
        const errorMessage = "❌ Não foi possível entender a transação e OBJECT é null.";

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

    } catch (error: unknown) {
        console.error("❌ Erro ao processar a mensagem do agente:", error);

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");

        if (userId) {
            const { token: telegramToken, chatId: userChatId } = await getUserTelegramPrefs(userId).catch(() => ({ token: '', chatId: '' }));

            if (telegramToken && userChatId) {
                await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        chat_id: userChatId,
                        text: "Ocorreu um erro ao processar sua mensagem. Tente novamente.",
                    }),
                });
            }
        }

        return NextResponse.json(
            { success: false, reply: "Ocorreu um erro interno. Tente novamente." },
            { status: 500 }
        );
    }
}

export async function addTransactionServer(userId: string, transaction: Transaction) {
    const db = await initializeFirebaseAdmin();

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
  if (typeof name !== 'string') return '';
  return name
    .normalize("NFD")               // separa letras e acentos
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-zA-Z0-9 ]/g, "")  // remove caracteres especiais
    .trim()
    .toLowerCase();                 // converte para minúsculas
}
