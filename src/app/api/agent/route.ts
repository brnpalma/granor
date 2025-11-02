import { NextResponse } from "next/server";
import { generateObject, generateText } from "ai";
import { Transaction, transactionSchema } from "@/lib/types";
import { agentSystemPrompt } from "@/ai/rules";
import { google } from "@ai-sdk/google";
import admin from "firebase-admin";
import { firebaseConfig } from "@/lib/firebase";
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
        
        console.log("🧪 Data :", object.date);

        if(!object.date){
            const spNow = DateTime.now().setZone("America/Sao_Paulo");
            object.date = spNow.toJSDate(); // Luxon já gera o Date correto
            console.log("🧪 Data ajustada para SP:", object.date);
        }
        
        console.log("🧪 Objeto gerado pela IA:", object);
        
        if(object){
            if(object.iaDoubt){
                return NextResponse.json(
                    { success: false, reply: "❌ Duvida da IA: " + object.iaReply },
                    { status: 428 }
                );
            }
            else{
                console.log("IA SEM DUVIDAS");
            }

            await addTransactionServer(userId, object as Transaction);

            const reply = `✅ ${object.type} de R$${object.amount} registrada na categoria ${object.category}.
                            \n\nSolicitação original: ${mensagemUsuario}
                            \n\nResposta do assistente: ${jsonIA}`;

            // Se veio do Telegram, envie para o chat correto; caso contrário, use CHAT_ID padrão
            const chatId = body.message?.chat?.id ?? process.env.TELEGRAM_CHAT_ID;

            await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({   
                    chat_id: chatId,
                    text: reply,
                }),
            });

            return NextResponse.json({ success: true, reply });
        }
        
        return NextResponse.json({ 
            success: false, 
            reply: jsonIA || "❌ Não foi possível entender a transação." 
        });
    } catch (error: any) {
        console.error("❌ Erro ao processar a mensagem do agente:", error);
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
                projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
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