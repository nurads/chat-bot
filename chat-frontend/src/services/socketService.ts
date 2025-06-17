import { io, Socket } from 'socket.io-client'

class SocketService {
    private socket: Socket | null = null
    private readonly serverUrl: string

    constructor() {
        this.serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    }

    connect(): Socket {
        if (this.socket?.connected) {
            return this.socket
        }

        this.socket = io(this.serverUrl, {
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        })

        this.socket.on('connect', () => {
            console.log('Connected to server:', this.socket?.id)
        })

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server')
        })

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error)
        })

        return this.socket
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect()
            this.socket = null
        }
    }

    getSocket(): Socket | null {
        return this.socket
    }

    isConnected(): boolean {
        return this.socket?.connected || false
    }

    // Join a conversation room
    joinConversation(conversationId: string): void {
        if (this.socket) {
            this.socket.emit('join_conversation', conversationId)
        }
    }

    // Leave a conversation room
    leaveConversation(conversationId: string): void {
        if (this.socket) {
            this.socket.emit('leave_conversation', conversationId)
        }
    }

    // Send a message
    sendMessage(data: { conversationId: string; message: string; userId?: string }): void {
        if (this.socket) {
            this.socket.emit('send_message', data)
        }
    }

    // Typing indicators
    startTyping(data: { conversationId: string; userId: string }): void {
        if (this.socket) {
            this.socket.emit('typing_start', data)
        }
    }

    stopTyping(data: { conversationId: string; userId: string }): void {
        if (this.socket) {
            this.socket.emit('typing_stop', data)
        }
    }

    // Event listeners
    onMessageReceived(callback: (message: any) => void): void {
        if (this.socket) {
            this.socket.on('message_received', callback)
        }
    }

    onAIResponseChunk(callback: (chunk: any) => void): void {
        if (this.socket) {
            this.socket.on('ai_response_chunk', callback)
        }
    }

    onAIResponseComplete(callback: (message: any) => void): void {
        if (this.socket) {
            this.socket.on('ai_response_complete', callback)
        }
    }

    onAITyping(callback: (data: { isTyping: boolean }) => void): void {
        if (this.socket) {
            this.socket.on('ai_typing', callback)
        }
    }

    onUserTyping(callback: (data: { userId: string; isTyping: boolean }) => void): void {
        if (this.socket) {
            this.socket.on('user_typing', callback)
        }
    }

    onError(callback: (error: any) => void): void {
        if (this.socket) {
            this.socket.on('error', callback)
        }
    }

    // Remove event listeners
    off(event: string, callback?: any): void {
        if (this.socket) {
            this.socket.off(event, callback)
        }
    }
}

export const socketService = new SocketService() 