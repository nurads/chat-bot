import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { socketService } from '../services/socketService'

interface Message {
    id: string
    content: string
    role: 'user' | 'assistant'
    createdAt: string
    conversationId: string
}

interface ChatContextType {
    currentConversationId: string | null
    setCurrentConversationId: (id: string | null) => void
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
    const [messages, setMessages] = useState<Message[]>([])
    const [isAITyping, setIsAITyping] = useState(false)
    const [streamingMessage, setStreamingMessage] = useState('')
    const [isConnected, setIsConnected] = useState(false)

    // Initialize socket connection
    useEffect(() => {
        const socket = socketService.connect()

        socket.on('connect', () => {
            setIsConnected(true)
        })

        socket.on('disconnect', () => {
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
        })

        return () => {
            socketService.disconnect()
        }
    }, [])

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
            const response = await fetch(`${API_URL}/api/chat/c/${conversationId}/messages`)
            const data = await response.json()
            console.log('Fetched messages:', data)
            setMessages(data)
        } catch (error) {
            console.error('Failed to fetch messages:', error)
        }
    }

    const sendMessage = useCallback((message: string) => {
        if (!message.trim() || !currentConversationId || !isConnected) return

        const trimmedMessage = message.trim()

        // Add user message to UI immediately with a unique temp ID
        const tempId = `temp-${Date.now()}-${Math.random()}`
        const newUserMessage: Message = {
            id: tempId,
            content: trimmedMessage,
            role: 'user',
            createdAt: new Date().toISOString(),
            conversationId: currentConversationId
        }

        console.log('Adding temp message:', newUserMessage)
        setMessages(prev => [...prev, newUserMessage])

        // Clear any existing streaming state
        setStreamingMessage('')
        setIsAITyping(false)

        // Send message via socket
        socketService.sendMessage({
            conversationId: currentConversationId,
            message: trimmedMessage,
            userId: 'user-1' // You might want to get this from auth context
        })
    }, [currentConversationId, isConnected])

    return (
        <ChatContext.Provider value={{
            currentConversationId,
            setCurrentConversationId,
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