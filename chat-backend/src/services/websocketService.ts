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
    user?: {
        id: string;
        username: string;
        email: string;
    };
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
        // Enhanced JWT Authentication middleware for socket connections
        this.io.use(async (socket: any, next) => {
            try {
                console.log('Socket authentication attempt:', socket.id);

                // Get token from multiple possible sources
                const token = socket.handshake.auth?.token ||
                    socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
                    socket.request?.headers?.authorization?.replace('Bearer ', '');

                if (!token) {
                    console.log('Socket authentication failed: No token provided');
                    return next(new Error('Authentication failed: No token provided'));
                }

                // Verify JWT token
                let decoded: any;
                try {
                    decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
                } catch (jwtError) {
                    console.log('Socket authentication failed: Invalid token', jwtError);
                    return next(new Error('Authentication failed: Invalid or expired token'));
                }

                if (!decoded.userId) {
                    console.log('Socket authentication failed: Invalid token payload');
                    return next(new Error('Authentication failed: Invalid token payload'));
                }

                // Verify user exists in database and get fresh user data
                const userResult = await db.select({
                    id: users.id,
                    username: users.username,
                    email: users.email,
                }).from(users).where(eq(users.id, decoded.userId));

                if (userResult.length === 0) {
                    console.log('Socket authentication failed: User not found in database');
                    return next(new Error('Authentication failed: User not found'));
                }

                // Attach user info to socket
                socket.userId = userResult[0].id;
                socket.user = userResult[0];

                console.log(`Socket authenticated successfully: ${socket.id}, User: ${socket.user.username} (${socket.user.id})`);
                next();
            } catch (error) {
                console.error('Socket authentication error:', error);
                next(new Error('Authentication failed: Server error'));
            }
        });

        this.io.on('connection', (socket: any) => {
            console.log(`✅ Client connected: ${socket.id}, User: ${socket.user?.username} (${socket.user?.id})`);

            // Send authentication success confirmation
            socket.emit('auth_success', {
                userId: socket.userId,
                username: socket.user.username,
                email: socket.user.email
            });

            // Handle joining a conversation room (verify user owns the conversation)
            socket.on('join_conversation', async (conversationId: string) => {
                try {
                    if (!conversationId) {
                        socket.emit('error', { message: 'Conversation ID is required' });
                        return;
                    }

                    console.log(`User ${socket.user.username} attempting to join conversation: ${conversationId}`);

                    // Verify the conversation belongs to the user
                    const conversation = await db
                        .select()
                        .from(conversations)
                        .where(and(
                            eq(conversations.id, conversationId),
                            eq(conversations.userId, socket.userId)
                        ));

                    if (conversation.length === 0) {
                        console.log(`Access denied: User ${socket.user.username} cannot access conversation ${conversationId}`);
                        socket.emit('error', {
                            message: 'Conversation not found or access denied',
                            code: 'CONVERSATION_ACCESS_DENIED'
                        });
                        return;
                    }

                    socket.join(conversationId);
                    console.log(`✅ Client ${socket.id} (${socket.user.username}) joined conversation: ${conversationId}`);

                    // Confirm successful room join
                    socket.emit('conversation_joined', { conversationId });
                } catch (error) {
                    console.error('Error joining conversation:', error);
                    socket.emit('error', {
                        message: 'Failed to join conversation',
                        code: 'JOIN_CONVERSATION_ERROR'
                    });
                }
            });

            // Handle leaving a conversation room
            socket.on('leave_conversation', (conversationId: string) => {
                if (!conversationId) {
                    return;
                }

                socket.leave(conversationId);
                console.log(`Client ${socket.id} (${socket.user.username}) left conversation: ${conversationId}`);
                socket.emit('conversation_left', { conversationId });
            });

            // Handle incoming chat messages
            socket.on('send_message', async (data: { conversationId: string, message: string, userId?: string }) => {
                console.log('send_message received:', data, 'from user:', socket.user.username);
                try {
                    // Validate input
                    if (!data || typeof data !== 'object') {
                        socket.emit('error', {
                            message: 'Invalid message data',
                            code: 'INVALID_MESSAGE_DATA'
                        });
                        return;
                    }

                    if (!data.conversationId || !data.message) {
                        socket.emit('error', {
                            message: 'Conversation ID and message are required',
                            code: 'MISSING_REQUIRED_FIELDS'
                        });
                        return;
                    }

                    // Ensure the userId matches the authenticated user
                    const messageData = {
                        conversationId: data.conversationId,
                        message: data.message,
                        userId: socket.userId // Always use the authenticated user's ID
                    };

                    await this.handleChatMessage(socket, messageData);
                } catch (error) {
                    console.error('Error handling message:', error);
                    socket.emit('error', {
                        message: 'Failed to process message',
                        code: 'MESSAGE_PROCESSING_ERROR',
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            });

            // Handle user typing indicators
            socket.on('typing_start', async (data: { conversationId: string }) => {
                try {
                    if (!data?.conversationId) {
                        return;
                    }

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
                    } else {
                        console.log(`Typing denied: User ${socket.user.username} cannot access conversation ${data.conversationId}`);
                    }
                } catch (error) {
                    console.error('Error in typing_start:', error);
                }
            });

            socket.on('typing_stop', async (data: { conversationId: string }) => {
                try {
                    if (!data?.conversationId) {
                        return;
                    }

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
                    } else {
                        console.log(`Typing denied: User ${socket.user.username} cannot access conversation ${data.conversationId}`);
                    }
                } catch (error) {
                    console.error('Error in typing_stop:', error);
                }
            });

            // Handle disconnection
            socket.on('disconnect', (reason: string) => {
                console.log(`❌ Client disconnected: ${socket.id}, User: ${socket.user?.username}, Reason: ${reason}`);
            });

            // Handle authentication errors after connection
            socket.on('error', (error: any) => {
                console.error(`Socket error for user ${socket.user?.username}:`, error);
            });
        });

        // Handle connection errors (including authentication failures)
        this.io.engine.on('connection_error', (err) => {
            console.log('Connection error:', err.req?.url, err.code, err.message, err.context);
        });
    }

    private async handleChatMessage(socket: any, data: {
        conversationId: string;
        message: string;
        userId: string;
    }) {
        const { conversationId, message: userMessage, userId } = data;

        if (!userMessage?.trim()) {
            socket.emit('error', {
                message: 'Message cannot be empty',
                code: 'EMPTY_MESSAGE'
            });
            return;
        }

        // Verify the userId matches the authenticated socket user
        if (userId !== socket.userId) {
            console.log(`Security violation: User ${socket.user.username} attempted to send message as user ${userId}`);
            socket.emit('error', {
                message: 'Unauthorized: User ID mismatch',
                code: 'USER_ID_MISMATCH'
            });
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
                console.log(`Access denied: User ${socket.user.username} cannot send message to conversation ${conversationId}`);
                socket.emit('error', {
                    message: 'Conversation not found or access denied',
                    code: 'CONVERSATION_ACCESS_DENIED'
                });
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

            console.log(`✅ Message saved: ${savedUserMessage.id} from ${socket.user.username} in conversation ${conversationId}`);

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

            // Generate AI response
            await this.streamAIResponse(conversationId, conversationHistory, socket);

        } catch (error) {
            console.error('Error in handleChatMessage:', error);
            socket.emit('error', {
                message: 'Failed to process message',
                code: 'MESSAGE_PROCESSING_ERROR',
                error: error instanceof Error ? error.message : 'Unknown error'
            });

            // Stop AI typing indicator on error
            this.io.to(conversationId).emit('ai_typing', { isTyping: false });
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