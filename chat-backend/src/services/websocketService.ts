import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { conversations, messages, users } from '../db/schema';
import { openaiService } from './openai';
import { eq, and } from 'drizzle-orm';

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface AuthenticatedSocket extends SocketIOServer {
    userId?: string;
}

export class WebSocketService {
    private io: SocketIOServer;

    constructor(server: HTTPServer) {
        this.io = new SocketIOServer(server, {
            cors: {
                origin: process.env.FRONTEND_URL || "http://localhost:3001",
                methods: ["GET", "POST"]
            }
        });

        this.setupSocketHandlers();
    }

    private setupSocketHandlers() {
        // Authentication middleware for socket connections
        this.io.use(async (socket: any, next) => {
            try {
                const token = socket.handshake.auth.token;

                if (!token) {
                    return next(new Error('Authentication error: No token provided'));
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;

                // Verify user exists in database
                const user = await db.select({
                    id: users.id,
                    username: users.username,
                    email: users.email,
                }).from(users).where(eq(users.id, decoded.userId));

                if (user.length === 0) {
                    return next(new Error('Authentication error: User not found'));
                }

                // Attach user info to socket
                socket.userId = user[0].id;
                socket.user = user[0];
                next();
            } catch (error) {
                console.error('Socket authentication error:', error);
                next(new Error('Authentication error: Invalid token'));
            }
        });

        this.io.on('connection', (socket: any) => {
            console.log(`Client connected: ${socket.id}, User: ${socket.user?.username}`);

            // Handle joining a conversation room (verify user owns the conversation)
            socket.on('join_conversation', async (conversationId: string) => {
                try {
                    // Verify the conversation belongs to the user
                    const conversation = await db
                        .select()
                        .from(conversations)
                        .where(and(
                            eq(conversations.id, conversationId),
                            eq(conversations.userId, socket.userId)
                        ));

                    if (conversation.length === 0) {
                        socket.emit('error', { message: 'Conversation not found or access denied' });
                        return;
                    }

                    socket.join(conversationId);
                    console.log(`Client ${socket.id} joined conversation: ${conversationId}`);
                } catch (error) {
                    console.error('Error joining conversation:', error);
                    socket.emit('error', { message: 'Failed to join conversation' });
                }
            });

            // Handle leaving a conversation room
            socket.on('leave_conversation', (conversationId: string) => {
                socket.leave(conversationId);
                console.log(`Client ${socket.id} left conversation: ${conversationId}`);
            });

            // Handle incoming chat messages
            socket.on('send_message', async (data: { conversationId: string, message: string }) => {
                console.log('send_message', data);
                try {
                    await this.handleChatMessage(socket, data);
                } catch (error) {
                    console.error('Error handling message:', error);
                    socket.emit('error', {
                        message: 'Failed to process message',
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            });

            // Handle user typing indicators
            socket.on('typing_start', async (data: { conversationId: string }) => {
                try {
                    // Verify user has access to the conversation
                    const conversation = await db
                        .select()
                        .from(conversations)
                        .where(and(
                            eq(conversations.id, data.conversationId),
                            eq(conversations.userId, socket.userId)
                        ));

                    if (conversation.length > 0) {
                        socket.to(data.conversationId).emit('user_typing', {
                            userId: socket.userId,
                            username: socket.user.username,
                            isTyping: true
                        });
                    }
                } catch (error) {
                    console.error('Error in typing_start:', error);
                }
            });

            socket.on('typing_stop', async (data: { conversationId: string }) => {
                try {
                    // Verify user has access to the conversation
                    const conversation = await db
                        .select()
                        .from(conversations)
                        .where(and(
                            eq(conversations.id, data.conversationId),
                            eq(conversations.userId, socket.userId)
                        ));

                    if (conversation.length > 0) {
                        socket.to(data.conversationId).emit('user_typing', {
                            userId: socket.userId,
                            username: socket.user.username,
                            isTyping: false
                        });
                    }
                } catch (error) {
                    console.error('Error in typing_stop:', error);
                }
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                console.log(`Client disconnected: ${socket.id}, User: ${socket.user?.username}`);
            });
        });
    }

    private async handleChatMessage(socket: any, data: {
        conversationId: string;
        message: string;
    }) {
        const { conversationId, message: userMessage } = data;

        if (!userMessage?.trim()) {
            socket.emit('error', { message: 'Message cannot be empty' });
            return;
        }

        try {
            // Verify the conversation belongs to the user
            const conversation = await db
                .select()
                .from(conversations)
                .where(and(
                    eq(conversations.id, conversationId),
                    eq(conversations.userId, socket.userId)
                ));

            if (conversation.length === 0) {
                socket.emit('error', { message: 'Conversation not found or access denied' });
                return;
            }

            // Save user message to database
            const [savedUserMessage] = await db
                .insert(messages)
                .values({
                    conversationId,
                    content: userMessage.trim(),
                    role: 'user'
                })
                .returning();

            // Emit user message to all clients in the conversation
            this.io.to(conversationId).emit('message_received', {
                id: savedUserMessage.id,
                content: savedUserMessage.content,
                role: 'user',
                conversationId,
                createdAt: savedUserMessage.createdAt
            });

            // Get conversation history for context
            const conversationHistory = await db
                .select()
                .from(messages)
                .where(eq(messages.conversationId, conversationId))
                .orderBy(messages.createdAt);

            // Emit typing indicator for AI
            this.io.to(conversationId).emit('ai_typing', { isTyping: true });

            // Generate AI response with streaming
            await this.streamAIResponse(conversationId, conversationHistory, socket);

        } catch (error) {
            console.error('Error in handleChatMessage:', error);
            socket.emit('error', {
                message: 'Failed to process message',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    private async streamAIResponse(conversationId: string, conversationHistory: any[], socket: any) {
        let fullResponse = '';
        let messageId: string | null = null;

        try {
            // Convert to OpenAI format
            const chatMessages: ChatMessage[] = conversationHistory.map(msg => ({
                role: msg.role as 'user' | 'assistant',
                content: msg.content
            }));

            console.log('chatMessages', chatMessages);

            // Get streaming response from OpenAI
            const stream = await openaiService.streamChatCompletion(chatMessages, socket);

            // Start streaming chunks to clients
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content;

                console.log('chunk', chunk);

                if (content) {
                    // Accumulate the full response
                    fullResponse += content;

                    // Emit each chunk to all clients in the conversation
                    this.io.to(conversationId).emit('ai_response_chunk', {
                        content,
                        isComplete: false,
                        messageId
                    });
                }
            }

            // Save the complete AI response to database
            const [savedAIMessage] = await db
                .insert(messages)
                .values({
                    conversationId,
                    content: fullResponse,
                    role: 'assistant'
                })
                .returning();

            // Emit completion with final message data
            this.io.to(conversationId).emit('ai_response_complete', {
                id: savedAIMessage.id,
                content: fullResponse,
                role: 'assistant',
                conversationId,
                createdAt: savedAIMessage.createdAt
            });

            // Stop AI typing indicator
            this.io.to(conversationId).emit('ai_typing', { isTyping: false });

        } catch (error) {
            console.error('Error streaming AI response:', error);

            // Emit error to clients
            this.io.to(conversationId).emit('ai_response_error', {
                message: 'Failed to generate AI response',
                error: error instanceof Error ? error.message : 'Unknown error'
            });

            // Stop AI typing indicator on error
            this.io.to(conversationId).emit('ai_typing', { isTyping: false });
        }
    }

    // Public methods for external use
    public sendToConversation(conversationId: string, event: string, data: any) {
        this.io.to(conversationId).emit(event, data);
    }

    public broadcast(event: string, data: any) {
        this.io.emit(event, data);
    }

    public getIO() {
        return this.io;
    }
}

// Singleton instance
let websocketService: WebSocketService | null = null;

export const initializeWebSocketService = (server: HTTPServer) => {
    if (!websocketService) {
        websocketService = new WebSocketService(server);
    }
    return websocketService;
}; 