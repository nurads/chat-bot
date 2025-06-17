import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import ChatArea from './ChatArea'
import { useChat } from '../contexts/ChatContext'

export default function ChatLayout() {
    const { conversationId } = useParams()
    const { currentConversationId, setCurrentConversationId } = useChat()
    const navigate = useNavigate()

    // Sync URL parameter with context state - URL is the source of truth
    useEffect(() => {
        console.log('ChatLayout: URL conversationId:', conversationId)
        console.log('ChatLayout: Current context conversationId:', currentConversationId)

        // Update context to match URL
        if (conversationId !== currentConversationId) {
            console.log('ChatLayout: Syncing context with URL:', conversationId || null)
            setCurrentConversationId(conversationId || null)
        }
    }, [conversationId, setCurrentConversationId])

    return (
        <div className="flex h-screen bg-background">
            <Sidebar />
            <ChatArea />
        </div>
    )
} 