import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { socketService } from '../services/socketService'
import { useAuth } from './AuthContext'

interface Message {
    id: string
    content: string
    role: 'user' | 'assistant'
    createdAt: string
    conversationId: string
}

interface Conversation {
    id: string
    title: string
    createdAt: string
    updatedAt: string
}

interface ChatContextType {
    currentConversationId: string | null
    setCurrentConversationId: (id: string | null) => void
    conversations: Conversation[]
    setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>
    messages: Message[]
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>
    isAITyping: boolean
    streamingMessage: string
    sendMessage: (message: string) => void
    isConnected: boolean
}

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: ReactNode }) {
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [messages, setMessages] = useState<Message[]>([])
    const [isAITyping, setIsAITyping] = useState(false)
    const [streamingMessage, setStreamingMessage] = useState('')
    const [isConnected, setIsConnected] = useState(false)
    const { user, token } = useAuth()

    // Debug: Track currentConversationId changes
    useEffect(() => {
        console.log('ChatContext: currentConversationId changed to:', currentConversationId)
    }, [currentConversationId])

    // Create a wrapper for setCurrentConversationId with debugging
    const setCurrentConversationIdWithDebug = (id: string | null) => {
        console.log('ChatContext: Setting currentConversationId from', currentConversationId, 'to', id)
        setCurrentConversationId(id)
    }

    // Initialize socket connection only when user is authenticated
    useEffect(() => {
        if (!user || !token) {
            setIsConnected(false)
            return
        }

    }, [user, token])
    useEffect(() => {
        if (!user || !token) {
            setIsConnected(false)
            return
        }

        console.log('ChatContext: Initializing socket connection for user:', user.email)
        const socket = socketService.connect(token)

        socket.on('connect', () => {
            console.log('ChatContext: Socket connected successfully')
            setIsConnected(true)
        })

        socket.on('disconnect', () => {
            console.log('ChatContext: Socket disconnected')
            setIsConnected(false)
        })

        // Handle authentication errors
        socketService.onAuthError((error: any) => {
            console.error('ChatContext: Socket authentication failed:', error)
            setIsConnected(false)

            // If authentication failed, the token might be expired or invalid
            if (error.action === 'LOGOUT_REQUIRED') {
                console.log('ChatContext: Forcing logout due to authentication failure')
                // This will trigger a logout through the auth context
                window.dispatchEvent(new CustomEvent('auth:force-logout', {
                    detail: { reason: 'Socket authentication failed' }
                }))
            }
        })

        socketService.onConnectionFailed((data: any) => {
            console.error('ChatContext: Socket connection failed after multiple attempts:', data)
            setIsConnected(false)
        })

        // Set up message listeners
        socketService.onMessageReceived((message: Message) => {
            console.log('Message received:', message)
            setMessages(prev => {
                // Replace temporary message with the real one from server
                const withoutTemp = prev.filter(msg =>
                    !(msg.id.startsWith('temp-') &&
                        msg.content === message.content &&
                        msg.role === message.role &&
                        msg.conversationId === message.conversationId)
                )

                // Check if message already exists (avoid duplicates)
                const messageExists = withoutTemp.some(msg => msg.id === message.id)
                if (messageExists) {
                    return withoutTemp
                }

                return [...withoutTemp, message]
            })
        })

        socketService.onAIResponseChunk((chunk: { content: string; isComplete: boolean; messageId: string | null }) => {
            console.log('AI chunk received:', chunk)
            setStreamingMessage(prev => prev + chunk.content)
        })

        socketService.onAIResponseComplete((message: Message) => {
            console.log('AI response complete:', message)
            setMessages(prev => {
                // Check if message already exists (avoid duplicates)
                const messageExists = prev.some(msg => msg.id === message.id)
                if (messageExists) {
                    return prev
                }
                return [...prev, message]
            })
            setStreamingMessage('')
            setIsAITyping(false)
        })

        socketService.onAITyping((data: { isTyping: boolean }) => {
            console.log('AI typing status:', data)
            setIsAITyping(data.isTyping)
            if (data.isTyping) {
                // Reset streaming message when AI starts typing
                setStreamingMessage('')
            }
        })

        socketService.onError((error: any) => {
            console.error('Socket error:', error)
            setIsAITyping(false)
            setStreamingMessage('')

            // Handle specific error codes
            if (error.code === 'CONVERSATION_ACCESS_DENIED') {
                console.error('Access denied to conversation - user may not have permission')
            } else if (error.code === 'USER_ID_MISMATCH') {
                console.error('Security violation detected - forcing logout')
                window.dispatchEvent(new CustomEvent('auth:force-logout', {
                    detail: { reason: 'Security violation detected' }
                }))
            }
        })

        return () => {
            console.log('ChatContext: Cleaning up socket connection')
            socketService.disconnect()
        }
    }, [user, token])

    // Handle conversation changes
    useEffect(() => {
        if (currentConversationId) {
            // Clear previous conversation state
            setMessages([])
            setStreamingMessage('')
            setIsAITyping(false)

            // Join the new conversation room
            socketService.joinConversation(currentConversationId)

            // Fetch existing messages
            fetchMessages(currentConversationId)
        }

        // Cleanup: leave previous conversation room if needed
        return () => {
            if (currentConversationId) {
                socketService.leaveConversation(currentConversationId)
            }
        }
    }, [currentConversationId])

    const fetchMessages = async (conversationId: string) => {
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
            const response = await fetch(`${API_URL}/api/chat/c/${conversationId}/messages`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            })

            if (!response.ok) {
                throw new Error('Failed to fetch messages')
            }

            const data = await response.json()
            console.log('Fetched messages:', data)
            setMessages(data)
        } catch (error) {
            console.error('Failed to fetch messages:', error)
        }
    }

    const sendMessage = useCallback((message: string, conversationId?: string) => {

        console.log(currentConversationId, conversationId, user, message.trim())

        if ((!message.trim() || !isConnected || !user)) return

        if (!currentConversationId && !conversationId) return

        console.log('debug currentConversationId', currentConversationId)

        const trimmedMessage = message.trim()


        // Add user message to UI immediately with a unique temp ID
        const tempId = `temp-${Date.now()}-${Math.random()}`
        const newUserMessage: Message = {
            id: tempId,
            content: trimmedMessage,
            role: 'user',
            createdAt: new Date().toISOString(),
            conversationId: currentConversationId || conversationId || ""
        }
        console.log('Adding temp message:', newUserMessage)
        setMessages(prev => [...prev, newUserMessage])

        // Clear any existing streaming state
        setStreamingMessage('')
        setIsAITyping(false)

        // Send message via socket
        socketService.sendMessage({
            conversationId: currentConversationId || conversationId || "",
            message: trimmedMessage,
            userId: user.id
        })
    }, [currentConversationId, isConnected, user])

    return (
        <ChatContext.Provider value={{
            currentConversationId,
            setCurrentConversationId: setCurrentConversationIdWithDebug,
            conversations,
            setConversations,
            messages,
            setMessages,
            isAITyping,
            streamingMessage,
            sendMessage,
            isConnected
        }}>
            {children}
        </ChatContext.Provider>
    )
}

export function useChat() {
    const context = useContext(ChatContext)
    if (context === undefined) {
        throw new Error('useChat must be used within a ChatProvider')
    }
    return context
} 