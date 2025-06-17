import { Request, Response } from 'express';
import { db } from '../db';
import { conversations, messages, users } from '../db/schema';
import { openaiService } from '../services/openai';
import { eq, desc } from 'drizzle-orm';

export const chatController = {



    async getConversations(req: Request, res: Response) {
        try {
            const allConversations = await db
                .select()
                .from(conversations)
                .orderBy(desc(conversations.updatedAt));

            res.json(allConversations);
        } catch (error) {
            console.error('Error fetching conversations:', error);
            res.status(500).json({ error: 'Failed to fetch conversations' });
        }
    },

    // Get messages for a specific conversation
    async getMessages(req: Request, res: Response) {
        try {
            const { conversationId } = req.params;

            const conversationMessages = await db
                .select()
                .from(messages)
                .where(eq(messages.conversationId, conversationId))
                .orderBy(messages.createdAt);

            res.json(conversationMessages);
        } catch (error) {
            console.error('Error fetching messages:', error);
            res.status(500).json({ error: 'Failed to fetch messages' });
        }
    },

    // Send a message and get AI response
    async sendMessage(req: Request, res: Response) {
        try {
            const { conversationId, message } = req.body;

            // Save user message
            const [userMessage] = await db
                .insert(messages)
                .values({
                    conversationId,
                    content: message,
                    role: 'user'
                })
                .returning();

            // Get conversation history
            const conversationHistory = await db
                .select()
                .from(messages)
                .where(eq(messages.conversationId, conversationId))
                .orderBy(messages.createdAt);

            // Set headers for streaming
            res.setHeader('Content-Type', 'text/plain');
            res.setHeader('Transfer-Encoding', 'chunked');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            let fullResponse = '';

            // Stream OpenAI response
            const stream = await openaiService.createCompletion(conversationHistory);

            // for await (const chunk of stream) {
            //     const content = chunk; // chunk is already a string
            //     if (content) {
            //         fullResponse += content;
            //         res.write(`data: ${JSON.stringify({ content })}\n\n`);
            //     }
            // }

            // Save assistant message
            await db
                .insert(messages)
                .values({
                    conversationId,
                    content: fullResponse,
                    role: 'assistant'
                })

            res.write('data: [DONE]\n\n');
            res.end();

        } catch (error) {
            console.error('Error sending message:', error);
            res.status(500).json({ error: 'Failed to send message' });
        }
    },

    // Create a new conversation
    async createConversation(req: Request, res: Response) {
        try {
            const { title, userId } = req.body;

            const [newConversation] = await db
                .insert(conversations)
                .values({
                    userId: userId,
                    title: title || 'New Chat'
                })
                .returning();

            res.json(newConversation);
        } catch (error) {
            console.error('Error creating conversation:', error);
            res.status(500).json({ error: 'Failed to create conversation' });
        }
    },

    async deleteConversation(req: Request, res: Response) {
        try {
            const { conversationId } = req.params;

            await db
                .delete(conversations)
                .where(eq(conversations.id, conversationId));

            res.json({ success: true });
        } catch (error) {
            console.error('Error deleting conversation:', error);
            res.status(500).json({ error: 'Failed to delete conversation' });
        }
    }
} 