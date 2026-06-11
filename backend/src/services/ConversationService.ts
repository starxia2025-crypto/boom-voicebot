import { InputType, MessageRole } from "../generated/prisma/enums.js";
import { prisma } from "../lib/prisma.js";
import { ChatInputType, ProductMatch } from "../types.js";

export class ConversationService {
  async list() {
    return prisma.conversation.findMany({
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });
  }

  async getById(id: string) {
    return prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });
  }

  async getContext(conversationId?: string) {
    if (!conversationId) {
      return {
        recentMessages: [] as Array<{
          role: "user" | "assistant";
          content: string;
        }>,
        lastMatchedProducts: [] as ProductMatch[],
      };
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 6,
        },
        auditLogs: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!conversation) {
      return {
        recentMessages: [] as Array<{
          role: "user" | "assistant";
          content: string;
        }>,
        lastMatchedProducts: [] as ProductMatch[],
      };
    }

    const lastAuditLog = conversation.auditLogs[0];
    const lastMatchedProducts = Array.isArray(lastAuditLog?.matchedProducts)
      ? (lastAuditLog.matchedProducts as ProductMatch[])
      : [];

    return {
      recentMessages: conversation.messages
        .slice()
        .reverse()
        .map((message) => ({
          role: (message.role === MessageRole.user ? "user" : "assistant") as "user" | "assistant",
          content: message.content,
        })),
      lastMatchedProducts,
    };
  }

  async createOrAppend(params: {
    conversationId?: string;
    branch: string;
    userMessage: string;
    assistantMessage: string;
    inputType: ChatInputType;
    normalizedQuery: string;
    matchedProducts: ProductMatch[];
    hadEnoughData: boolean;
    errorMessage?: string;
  }) {
    const conversation =
      params.conversationId &&
      (await prisma.conversation.findUnique({
        where: { id: params.conversationId },
      }));

    const savedConversation = conversation
      ? await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            branch: params.branch,
          },
        })
      : await prisma.conversation.create({
          data: {
            branch: params.branch,
          },
        });

    await prisma.conversationMessage.createMany({
      data: [
        {
          conversationId: savedConversation.id,
          role: MessageRole.user,
          content: params.userMessage,
          inputType: params.inputType === "voice" ? InputType.voice : InputType.text,
        },
        {
          conversationId: savedConversation.id,
          role: MessageRole.assistant,
          content: params.assistantMessage,
          inputType: InputType.text,
        },
      ],
    });

    await prisma.conversationAuditLog.create({
      data: {
        conversationId: savedConversation.id,
        originalQuery: params.userMessage,
        normalizedQuery: params.normalizedQuery,
        matchedProducts: JSON.parse(JSON.stringify(params.matchedProducts)),
        generatedResponse: params.assistantMessage,
        hadEnoughData: params.hadEnoughData,
        errorMessage: params.errorMessage ?? null,
      },
    });

    return this.getById(savedConversation.id);
  }
}
