import { io, Socket } from 'socket.io-client'

class SocketService {
    private socket: Socket | null = null
    private readonly serverUrl: string
    private currentToken: string | null = null
    private reconnectAttempts: number = 0
    private maxReconnectAttempts: number = 5

    constructor() {
        this.serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    }

    connect(token?: string): Socket {
        // Store the current token for reconnection attempts
        if (token) {
            this.currentToken = token
        }

        // If already connected with the same token, return existing socket
        if (this.socket?.connected && this.currentToken === token) {
            return this.socket
        }

        // Disconnect existing socket if connecting with different token
        if (this.socket && this.currentToken !== token) {
            console.log('Token changed, disconnecting existing socket')
            this.disconnect()
        }

        const socketOptions: any = {
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 10000,
        }

        // Add JWT authentication if token is provided
        if (this.currentToken) {
            socketOptions.auth = {
                token: this.currentToken
            }
        } else {
            console.warn('No authentication token provided for socket connection')
        }

        this.socket = io(this.serverUrl, socketOptions)

        this.setupEventHandlers()

        return this.socket
    }

    private setupEventHandlers(): void {
        if (!this.socket) return

        this.socket.on('connect', () => {
            console.log('✅ Connected to server:', this.socket?.id)
            this.reconnectAttempts = 0
        })

        this.socket.on('disconnect', (reason: string) => {
            console.log('❌ Disconnected from server:', reason)

            // Handle different disconnect reasons
            if (reason === 'io server disconnect') {
                console.log('Server initiated disconnect - likely authentication failure')
            } else if (reason === 'io client disconnect') {
                console.log('Client initiated disconnect')
            } else {
                console.log('Network disconnect, attempting to reconnect...')
            }
        })

        this.socket.on('connect_error', (error: any) => {
            console.error('❌ Connection error:', error.message)
            this.reconnectAttempts++

            // Handle authentication errors specifically
            if (error.message?.includes('Authentication failed') ||
                error.message?.includes('No token provided') ||
                error.message?.includes('Invalid token')) {
                console.error('🔑 Authentication failed - token may be invalid or expired')

                // Stop further reconnection attempts for auth errors
                if (this.socket) {
                    this.socket.disconnect()
                }

                // Emit custom auth error event for the app to handle
                this.socket?.emit('auth_error', {
                    message: 'Authentication failed',
                    reason: error.message,
                    action: 'LOGOUT_REQUIRED'
                })
            } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('🔄 Max reconnection attempts reached')
                this.socket?.emit('connection_failed', {
                    message: 'Failed to connect after multiple attempts',
                    attempts: this.reconnectAttempts
                })
            }
        })

        this.socket.on('auth_error', (error: any) => {
            console.error('🔑 Authentication error from server:', error)
        })

        this.socket.on('auth_success', (data: any) => {
            console.log('✅ Socket authentication successful:', data)
        })

        this.socket.on('error', (error: any) => {
            console.error('Socket error:', error)
        })

        // Handle conversation events
        this.socket.on('conversation_joined', (data: { conversationId: string }) => {
            console.log('✅ Successfully joined conversation:', data.conversationId)
        })

        this.socket.on('conversation_left', (data: { conversationId: string }) => {
            console.log('👋 Left conversation:', data.conversationId)
        })
    }

    disconnect(): void {
        if (this.socket) {
            console.log('Disconnecting socket...')
            this.socket.disconnect()
            this.socket = null
            this.currentToken = null
            this.reconnectAttempts = 0
        }
    }

    // Reconnect with new token (useful for token refresh)
    reconnectWithToken(newToken: string): Socket {
        console.log('Reconnecting with new token...')
        this.disconnect()
        return this.connect(newToken)
    }

    getSocket(): Socket | null {
        return this.socket
    }

    isConnected(): boolean {
        return this.socket?.connected || false
    }

    isAuthenticated(): boolean {
        return this.isConnected() && !!this.currentToken
    }

    // Join a conversation room with validation
    joinConversation(conversationId: string): void {
        if (!this.socket) {
            console.error('Cannot join conversation: Socket not connected')
            return
        }

        if (!conversationId) {
            console.error('Cannot join conversation: Invalid conversation ID')
            return
        }

        if (!this.isAuthenticated()) {
            console.error('Cannot join conversation: Not authenticated')
            return
        }

        console.log('Joining conversation:', conversationId)
        this.socket.emit('join_conversation', conversationId)
    }

    // Leave a conversation room
    leaveConversation(conversationId: string): void {
        if (!this.socket) {
            console.error('Cannot leave conversation: Socket not connected')
            return
        }

        if (!conversationId) {
            console.error('Cannot leave conversation: Invalid conversation ID')
            return
        }

        console.log('Leaving conversation:', conversationId)
        this.socket.emit('leave_conversation', conversationId)
    }

    // Send a message with enhanced validation
    sendMessage(data: { conversationId: string; message: string; userId?: string }): void {
        if (!this.socket) {
            console.error('Cannot send message: Socket not connected')
            return
        }

        if (!this.isAuthenticated()) {
            console.error('Cannot send message: Not authenticated')
            return
        }

        if (!data.conversationId || !data.message?.trim()) {
            console.error('Cannot send message: Invalid conversation ID or empty message')
            return
        }

        console.log('Sending message to conversation:', data.conversationId)
        this.socket.emit('send_message', {
            conversationId: data.conversationId,
            message: data.message.trim(),
            // Don't include userId - let server use authenticated user
        })
    }

    // Typing indicators
    startTyping(data: { conversationId: string; userId: string }): void {
        if (!this.socket || !this.isAuthenticated()) {
            console.error('Cannot start typing: Socket not connected or not authenticated')
            return
        }

        if (!data.conversationId) {
            console.error('Cannot start typing: Invalid conversation ID')
            return
        }

        this.socket.emit('typing_start', { conversationId: data.conversationId })
    }

    stopTyping(data: { conversationId: string; userId: string }): void {
        if (!this.socket || !this.isAuthenticated()) {
            console.error('Cannot stop typing: Socket not connected or not authenticated')
            return
        }

        if (!data.conversationId) {
            console.error('Cannot stop typing: Invalid conversation ID')
            return
        }

        this.socket.emit('typing_stop', { conversationId: data.conversationId })
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

    onAuthError(callback: (error: any) => void): void {
        if (this.socket) {
            this.socket.on('auth_error', callback)
        }
    }

    onConnectionFailed(callback: (data: any) => void): void {
        if (this.socket) {
            this.socket.on('connection_failed', callback)
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