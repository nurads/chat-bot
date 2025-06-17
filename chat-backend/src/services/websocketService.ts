import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { db } from '../db';
import { conversations, messages } from '../db/schema';
import { openaiService } from './openai';
import { eq } from 'drizzle-orm';

interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
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
        this.io.on('connection', (socket) => {
            console.log(`Client connected: ${socket.id}`);

            // Handle joining a conversation room

            socket.on('join_conversation', (conversationId: string) => {
                socket.join(conversationId);
                console.log(`Client ${socket.id} joined conversation: ${conversationId}`);
            });

            // // Handle leaving a conversation room
            socket.on('leave_conversation', (conversationId: string) => {
                socket.leave(conversationId);
                console.log(`Client ${socket.id} left conversation: ${conversationId}`);
            });

            // Handle incoming chat messages
            socket.on('send_message', async (data) => {
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
            socket.on('typing_start', (data) => {
                socket.to(data.conversationId).emit('user_typing', {
                    userId: data.userId,
                    isTyping: true
                });
            });

            socket.on('typing_stop', (data) => {
                socket.to(data.conversationId).emit('user_typing', {
                    userId: data.userId,
                    isTyping: false
                });
            });

            // Handle disconnection
            socket.on('disconnect', () => {
                console.log(`Client disconnected: ${socket.id}`);
            });
        });
    }

    private async handleChatMessage(socket: any, data: {
        conversationId: string;
        message: string;
        userId?: string;
    }) {
        const { conversationId, message: userMessage, userId } = data;

        if (!userMessage?.trim()) {
            socket.emit('error', { message: 'Message cannot be empty' });
            return;
        }

        try {
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

            // Stop AI typing indicator
            this.io.to(conversationId).emit('ai_typing', { isTyping: false });
        }
    }

    // Method to send messages to specific conversations from other parts of the app
    public sendToConversation(conversationId: string, event: string, data: any) {
        this.io.to(conversationId).emit(event, data);
    }

    // Method to broadcast to all connected clients
    public broadcast(event: string, data: any) {
        this.io.emit(event, data);
    }

    // Get Socket.IO instance for external use
    public getIO() {
        return this.io;
    }
}

export let websocketService: WebSocketService;

export const initializeWebSocketService = (server: HTTPServer) => {
    websocketService = new WebSocketService(server);
    return websocketService;
}; 