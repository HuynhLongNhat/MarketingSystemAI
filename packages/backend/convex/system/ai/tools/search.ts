
import { openai } from "@ai-sdk/openai";
import { createTool } from "@convex-dev/agent";
import { generateText } from "ai";
import { z } from "zod";

import { internal } from "../../../_generated/api";
import { supportAgent } from "../agents/supportAgent";
import rag from "../rag";
import { SEARCH_INTERPRETER_PROMPT } from "../constants";

export const search = createTool({
  description:
    "Search the knowledge base for relevant information to help answer user questions",

  // @ts-ignore -- Legacy Convex: conflicting Zod types across build contexts.
  args: z.object({
    query: z
      .string()
      .describe("The search query to find relevant information"),
  }),

  handler: async (ctx, args): Promise<string> => {
    if (!ctx.threadId) {
      return "Missing thread ID";
    }

    const conversation = await ctx.runQuery(
      internal.system.conversations.getByThreadId,
      {
        threadId: ctx.threadId,
      },
    );

    if (!conversation) {
      return "Conversation not found";
    }

    const searchResult = await rag.search(ctx, {
      namespace: conversation.organizationId,
      query: args.query,
      limit: 5,
    });

    const titles = searchResult.entries
      .map((entry) => entry.title || null)
      .filter((title) => title !== null)
      .join(", ");

    const contextText =
      `Found results in ${titles}. ` +
      `Here is the context:\n\n${searchResult.text}`;

    const response = await generateText({
      messages: [
        {
          role: "system",
          content: SEARCH_INTERPRETER_PROMPT,
        },
        {
          role: "user",
          content:
            `User asked: "${args.query}"\n\n` +
            `Search results: ${contextText}`,
        },
      ],
      model: openai.chat("gpt-4o-mini"),
    });

    await supportAgent.saveMessage(ctx, {
      threadId: ctx.threadId,
      message: {
        role: "assistant",
        content: response.text,
      },
    });

    return response.text;
  },
});
