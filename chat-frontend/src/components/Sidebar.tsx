import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, MessageSquare, Trash2, Edit3, LogOut } from 'lucide-react'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import { useChat } from '../contexts/ChatContext'
import { useAuth } from '../contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL

export default function Sidebar() {
    const { currentConversationId, setCurrentConversationId, conversations, setConversations } = useChat()
    const { user, token, logout } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        fetchConversations()
    }, [])

    const fetchConversations = async () => {
        try {
            const response = await fetch(API_URL + '/api/chat/c', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            })
            const data = await response.json()
            setConversations(data)
        } catch (error) {
            console.error('Failed to fetch conversations:', error)
        }
    }

    const createNewConversation = async () => {
        try {
            const response = await fetch(API_URL + '/api/chat/c', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ title: 'New Chat' })
            })
            const newConversation = await response.json()
            setConversations(prev => [newConversation, ...prev])
            setCurrentConversationId(newConversation.id)
            navigate(`/chat/${newConversation.id}`)
        } catch (error) {
            console.error('Failed to create conversation:', error)
        }
    }

    const deleteConversation = async (id: string) => {
        try {
            await fetch(API_URL + `/api/chat/c/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            })
            setConversations(prev => prev.filter(conv => conv.id !== id))
            if (currentConversationId === id) {
                setCurrentConversationId(null)
                navigate('/')
            }
        } catch (error) {
            console.error('Failed to delete conversation:', error)
        }
    }

    const handleLogout = () => {
        logout()
        navigate('/')
    }

    return (
        <div className="w-64 bg-gray-900 text-white flex flex-col h-full">
            {/* New Chat Button */}
            <div className="p-2">
                <Button
                    onClick={createNewConversation}
                    className="w-full justify-start gap-3 h-11 bg-transparent border border-gray-600 hover:bg-gray-800 text-white rounded-md"
                    variant="outline"
                >
                    <Plus className="h-4 w-4" />
                    New chat
                </Button>
            </div>

            {/* Conversations List */}
            <ScrollArea className="flex-1 px-2">
                <div className="space-y-1 pb-4">
                    {conversations.map((conversation) => (
                        <div
                            key={conversation.id}
                            className={`group flex items-center gap-2 p-3 rounded-md cursor-pointer hover:bg-gray-800 transition-colors ${currentConversationId === conversation.id
                                ? 'bg-gray-800'
                                : ''
                                }`}
                            onClick={() => {
                                setCurrentConversationId(conversation.id)
                                navigate(`/chat/${conversation.id}`)
                            }}
                        >
                            <MessageSquare className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-100 truncate flex-1 min-w-0">
                                {conversation.title}
                            </span>
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-gray-700 text-gray-400"
                                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                        e.stopPropagation()
                                        // Edit functionality could be added here
                                    }}
                                >
                                    <Edit3 className="h-3 w-3" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-gray-700 text-gray-400"
                                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                        e.stopPropagation()
                                        deleteConversation(conversation.id)
                                    }}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    ))}

                    {conversations.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <p className="text-sm">No conversations yet</p>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Footer */}
            <div className="border-t border-gray-700 p-4 space-y-3">
                <div className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-800 cursor-pointer">
                    <div className="w-6 h-6 bg-green-500 rounded-sm flex items-center justify-center">
                        <span className="text-xs font-bold text-white">AI</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-100">ChatGPT</p>
                        <p className="text-xs text-gray-400">GPT-4</p>
                    </div>
                </div>

                {/* User info and logout */}
                <div className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-800">
                    <div className="w-6 h-6 bg-blue-500 rounded-sm flex items-center justify-center">
                        <span className="text-xs font-bold text-white">{user?.name?.[0]?.toUpperCase() || 'U'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-100 truncate">{user?.name}</p>
                        <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-gray-700 text-gray-400"
                        onClick={handleLogout}
                        title="Logout"
                    >
                        <LogOut className="h-3 w-3" />
                    </Button>
                </div>
            </div>
        </div>
    )
} 