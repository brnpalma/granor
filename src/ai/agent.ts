import{ generateObject, generateText } from "ai";
import{ agentSystemPrompt } from "./rules";
import { transactionSchema } from "@/lib/types";

export async function processMessage(message: string){
    const { text } = await generateText({
        model: "openai/gpt-4o-mini",
        system: agentSystemPrompt,
        prompt: message,
    });

    const { object } = await generateObject({
        model: "openai/gpt-4o-mini",
        schema: transactionSchema,
        system: agentSystemPrompt,
        prompt: message,
    });

    return { parsed: object, raw: text};
}