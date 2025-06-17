import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Sidebar from './Sidebar'
import ChatArea from './ChatArea'
import { useChat } from '../contexts/ChatContext'

export default function ChatLayout() {
    const { conversationId } = useParams()
    const { currentConversationId, setCurrentConversationId } = useChat()

    useEffect(() => {
        if (conversationId) {
            setCurrentConversationId(conversationId)
        }
    }, [conversationId, setCurrentConversationId])

    return (
        <div className="flex h-screen bg-background">
            <Sidebar />
            <ChatArea />
        </div>
    )
} 