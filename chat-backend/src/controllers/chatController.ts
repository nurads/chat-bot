import { Request, Response } from 'express';
import { db } from '../db';
import { conversations, messages, users } from '../db/schema';
import { openaiService } from '../services/openai';
import { eq, desc, and } from 'drizzle-orm';

export const chatController = {



    async getConversations(req: Request, res: Response) {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const allConversations = await db
                .select()
                .from(conversations)
                .where(eq(conversations.userId, req.user.id))
                .orderBy(desc(conversations.updatedAt));

            return res.json(allConversations);
        } catch (error) {
            console.error('Error fetching conversations:', error);
            return res.status(500).json({ error: 'Failed to fetch conversations' });
        }
    },

    // Get messages for a specific conversation
    async getMessages(req: Request, res: Response) {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { conversationId } = req.params;

            const conversationMessages = await db
                .select()
                .from(messages)
                .where(eq(messages.conversationId, conversationId))
                .orderBy(messages.createdAt);

            return res.json(conversationMessages);
        } catch (error) {
            console.error('Error fetching messages:', error);
            return res.status(500).json({ error: 'Failed to fetch messages' });
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
            if (!req.user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { title } = req.body;

            const [newConversation] = await db
                .insert(conversations)
                .values({
                    userId: req.user.id,
                    title: title || 'New Chat'
                })
                .returning();

            return res.json(newConversation);
        } catch (error) {
            console.error('Error creating conversation:', error);
            return res.status(500).json({ error: 'Failed to create conversation' });
        }
    },

    async deleteConversation(req: Request, res: Response) {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const { conversationId } = req.params;

            await db
                .delete(conversations)
                .where(and(eq(conversations.id, conversationId), eq(conversations.userId, req.user.id)));

            return res.json({ success: true });
        } catch (error) {
            console.error('Error deleting conversation:', error);
            return res.status(500).json({ error: 'Failed to delete conversation' });
        }
    }
} 