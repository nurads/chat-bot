import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Bot, User, Copy, ThumbsUp, ThumbsDown, ChevronDown, Paperclip, Mic, Sparkles, MessageCircle, Code, BarChart3, PenTool } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useChat } from '@/contexts/ChatContext'
import { useAuth } from '@/contexts/AuthContext'
import TypingIndicator from './TypingIndicator'
const API_URL = import.meta.env.VITE_API_URL


const models = [
    { id: 'gpt-4', name: 'GPT-4', description: 'Most capable model', icon: '🧠', color: 'from-purple-500 to-indigo-600' },
    { id: 'gpt-3.5', name: 'GPT-3.5', description: 'Fast and efficient', icon: '⚡', color: 'from-green-500 to-emerald-600' },
    { id: 'claude', name: 'Claude', description: 'Anthropic\'s model', icon: '🎭', color: 'from-orange-500 to-red-600' }
]

const quickPrompts = [
    {
        title: 'Write & Debug Code',
        description: 'Get help with programming tasks and debugging',
        icon: Code,
        prompt: 'Help me write and debug code. What programming language or problem should we start with?'
    },
    {
        title: 'Analyze Data',
        description: 'Process and interpret your data',
        icon: BarChart3,
        prompt: 'Help me analyze data. What kind of dataset or analysis do you need assistance with?'
    },
    {
        title: 'Creative Writing',
        description: 'Generate stories, poems, and creative content',
        icon: PenTool,
        prompt: 'Help me with creative writing. What type of content would you like to create?'
    },
    {
        title: 'Answer Questions',
        description: 'Get detailed explanations on any topic',
        icon: MessageCircle,
        prompt: 'I\'m here to answer any questions you have. What would you like to know about?'
    }
]

export default function ChatArea() {
    const [input, setInput] = useState('')
    const [selectedModel, setSelectedModel] = useState(models[0])
    const [showModelDropdown, setShowModelDropdown] = useState(false)
    const [isCreatingConversation, setIsCreatingConversation] = useState(false)
    const {
        currentConversationId,
        setCurrentConversationId,
        messages,
        setConversations,
        isAITyping,
        streamingMessage,
        sendMessage: sendSocketMessage,
        isConnected
    } = useChat()
    const { token } = useAuth()
    const navigate = useNavigate()
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)


    useEffect(() => {
        scrollToBottom()
    }, [messages, streamingMessage, isAITyping])

    useEffect(() => {
        // Auto-resize textarea
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
        }
    }, [input])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }



    const createNewConversation = async (title?: string) => {
        try {
            setIsCreatingConversation(true)
            const response = await fetch(API_URL + '/api/chat/c', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ title: title || 'New Chat' })
            })
            const newConversation = await response.json()
            setCurrentConversationId(newConversation.id)
            navigate(`/chat/${newConversation.id}`)
            return newConversation.id
        } catch (error) {
            console.error('Failed to create conversation:', error)
            return null
        } finally {
            setIsCreatingConversation(false)
        }
    }


    const sendMessage = async (messageText?: string) => {
        const messageToSend = messageText || input.trim()
        if (!messageToSend || !isConnected) return

        console.log('ChatArea: sendMessage called with:', messageToSend)
        console.log('ChatArea: currentConversationId:', currentConversationId)

        // Clear input immediately to show responsiveness
        if (!messageText) {
            setInput('')
        }

        // If no conversation exists, create one first
        let conversationId = currentConversationId
        if (!conversationId) {

            const newConversationId = await createNewConversation(messageToSend)
            console.log('ChatArea: Created new conversation with ID:', newConversationId)

            if (!newConversationId) {
                console.error('ChatArea: Failed to create conversation')
                // If conversation creation failed, restore the input
                if (!messageText) {
                    setInput(messageToSend)
                }
                return
            }
            conversationId = newConversationId

            // Update the conversations list in the sidebar
            setConversations(prev => [{
                id: conversationId!,
                title: messageToSend.length > 50 ? messageToSend.substring(0, 50) + '...' : messageToSend,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }, ...prev])
        }

        console.log('ChatArea: Sending message to conversation:', conversationId)
        // Send the message after ensuring conversation exists
        sendSocketMessage(messageToSend, conversationId)
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    const handleQuickPrompt = (prompt: string) => {
        sendMessage(prompt)
    }

    const copyMessage = (content: string) => {
        navigator.clipboard.writeText(content)
    }

    if (!currentConversationId) {
        return (
            <div className="flex-1 flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen">
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="text-center max-w-4xl mx-auto">
                        {/* Hero Section */}
                        <div className="mb-12">
                            <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl">
                                <Sparkles className="h-12 w-12 text-white" />
                            </div>
                            <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-6">
                                How can I help you today?
                            </h1>
                            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                                Start a conversation with AI. Ask questions, get creative, solve problems, or just chat.
                            </p>

                            {/* Connection Status */}
                            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium mb-12 transition-all duration-300 ${isConnected
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm'
                                : 'bg-amber-100 text-amber-800 border border-amber-200 shadow-sm'
                                }`}>
                                <div className={`w-3 h-3 rounded-full mr-3 ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'
                                    }`}></div>
                                {isConnected ? '🟢 Connected & Ready' : '🟡 Connecting...'}
                            </div>
                        </div>

                        {/* Quick Action Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                            {quickPrompts.map((item, index) => {
                                const IconComponent = item.icon
                                return (
                                    <div
                                        key={index}
                                        className="group p-6 bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl hover:bg-white/90 hover:shadow-xl hover:scale-105 cursor-pointer transition-all duration-300 hover:-translate-y-1"
                                        onClick={() => handleQuickPrompt(item.prompt)}
                                    >
                                        <div className="flex items-start space-x-4">
                                            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                                <IconComponent className="h-6 w-6 text-white" />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                                                    {item.title}
                                                </h3>
                                                <p className="text-sm text-gray-600 leading-relaxed">
                                                    {item.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Enhanced Input Area */}
                <div className="border-t border-white/20 bg-white/50 backdrop-blur-sm p-6">
                    <div className="max-w-4xl mx-auto">
                        {/* Model Selection */}
                        <div className="flex items-center justify-center mb-6">
                            <div className="relative">
                                <Button
                                    variant="outline"
                                    className={`flex items-center gap-3 text-sm bg-gradient-to-r ${selectedModel.color} text-white border-0 hover:shadow-lg px-6 py-3 rounded-xl shadow-md transition-all duration-300 hover:scale-105`}
                                    onClick={() => setShowModelDropdown(!showModelDropdown)}
                                    disabled={!isConnected || isCreatingConversation}
                                >
                                    <span className="text-lg">{selectedModel.icon}</span>
                                    <span className="font-medium">{selectedModel.name}</span>
                                    <ChevronDown className="h-4 w-4 ml-1" />
                                </Button>
                                {showModelDropdown && (
                                    <div className="absolute bottom-full mb-2 left-0 bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-xl shadow-2xl min-w-80 z-10 overflow-hidden">
                                        {models.map((model) => (
                                            <button
                                                key={model.id}
                                                className={`w-full text-left px-6 py-4 hover:bg-gray-50 transition-all duration-200 first:rounded-t-xl last:rounded-b-xl border-l-4 hover:border-l-8 ${selectedModel.id === model.id
                                                    ? `bg-gradient-to-r ${model.color} text-white border-l-white`
                                                    : 'border-l-transparent hover:border-l-blue-400'
                                                    }`}
                                                onClick={() => {
                                                    setSelectedModel(model)
                                                    setShowModelDropdown(false)
                                                }}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${selectedModel.id === model.id
                                                        ? 'bg-white/20'
                                                        : `bg-gradient-to-br ${model.color} text-white shadow-lg`
                                                        }`}>
                                                        {model.icon}
                                                    </div>
                                                    <div>
                                                        <div className={`font-semibold ${selectedModel.id === model.id ? 'text-white' : 'text-gray-900'}`}>
                                                            {model.name}
                                                        </div>
                                                        <div className={`text-sm ${selectedModel.id === model.id ? 'text-white/80' : 'text-gray-600'}`}>
                                                            {model.description}
                                                        </div>
                                                    </div>
                                                    {selectedModel.id === model.id && (
                                                        <div className="ml-auto">
                                                            <div className="w-3 h-3 bg-white rounded-full"></div>
                                                        </div>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Enhanced Message Input */}
                        <div className="relative">
                            <Textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder={isConnected ? "Type your message... (Press Enter to send, Shift+Enter for new line)" : "Connecting..."}
                                className="min-h-14 max-h-32 pr-20 pl-6 py-4 resize-none border-0 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg placeholder:text-gray-500 text-base leading-relaxed focus:bg-white/90 focus:shadow-xl transition-all duration-300"
                                disabled={!isConnected || isCreatingConversation}
                            />
                            <div className="absolute right-3 bottom-3 flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-9 w-9 p-0 hover:bg-gray-100 rounded-xl"
                                    disabled={!isConnected || isCreatingConversation}
                                >
                                    <Paperclip className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-9 w-9 p-0 hover:bg-gray-100 rounded-xl"
                                    disabled={!isConnected || isCreatingConversation}
                                >
                                    <Mic className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => sendMessage()}
                                    disabled={!input.trim() || !isConnected || isCreatingConversation}
                                    className="h-9 w-9 p-0 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                                >
                                    {isCreatingConversation ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center justify-center mt-4 text-sm text-gray-500">
                            <span>
                                {isConnected ? '✨ AI can make mistakes. Please verify important information.' : '🔌 Disconnected'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col bg-gradient-to-b from-white to-gray-50 h-full">
            {/* Connection Status */}
            {!isConnected && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-6 py-3">
                    <div className="flex items-center text-amber-800">
                        <div className="w-3 h-3 bg-amber-500 rounded-full mr-3 animate-pulse"></div>
                        <span className="text-sm font-medium">🔄 Reconnecting to server...</span>
                    </div>
                </div>
            )}

            {/* Enhanced Messages Area */}
            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="w-full">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`w-full border-b border-gray-100/50 transition-colors duration-300 ${message.role === 'assistant'
                                    ? 'bg-gradient-to-r from-gray-50/50 to-blue-50/30'
                                    : 'bg-white hover:bg-gray-50/30'
                                    }`}
                            >
                                <div className="max-w-4xl mx-auto px-6 py-8">
                                    <div className="flex gap-6">
                                        <div className="flex-shrink-0">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg ${message.role === 'assistant'
                                                ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white'
                                                : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                                                }`}>
                                                {message.role === 'assistant' ? (
                                                    <Bot className="h-5 w-5" />
                                                ) : (
                                                    <User className="h-5 w-5" />
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="prose prose-base max-w-none">
                                                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap m-0 text-base">
                                                    {message.content}
                                                    {message.id.startsWith('temp-') && (
                                                        <span className="inline-block w-2 h-6 bg-blue-400 ml-2 animate-pulse rounded-sm"></span>
                                                    )}
                                                </p>
                                            </div>
                                            {message.role === 'assistant' && !message.id.startsWith('temp-') && (
                                                <div className="flex items-center gap-2 mt-6 text-gray-500">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-9 px-3 hover:bg-white rounded-xl transition-all duration-200"
                                                        onClick={() => copyMessage(message.content)}
                                                    >
                                                        <Copy className="h-4 w-4 mr-2" />
                                                        Copy
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-9 px-3 hover:bg-white rounded-xl transition-all duration-200"
                                                    >
                                                        <ThumbsUp className="h-4 w-4 mr-2" />
                                                        Good
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-9 px-3 hover:bg-white rounded-xl transition-all duration-200"
                                                    >
                                                        <ThumbsDown className="h-4 w-4 mr-2" />
                                                        Bad
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Enhanced Streaming Message */}
                        {streamingMessage && (
                            <div className="w-full border-b border-gray-100/50 bg-gradient-to-r from-gray-50/50 to-blue-50/30">
                                <div className="max-w-4xl mx-auto px-6 py-8">
                                    <div className="flex gap-6">
                                        <div className="flex-shrink-0">
                                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg">
                                                <Bot className="h-5 w-5" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="prose prose-base max-w-none">
                                                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap m-0 text-base">
                                                    {streamingMessage}
                                                    <span className="inline-block w-2 h-6 bg-emerald-400 ml-2 animate-pulse rounded-sm"></span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Enhanced AI Typing Indicator */}
                        <TypingIndicator isVisible={isAITyping && !streamingMessage} />

                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>
            </div>

            {/* Enhanced Input Area */}
            <div className="border-t border-gray-200/50 bg-white/80 backdrop-blur-sm p-6">
                <div className="max-w-4xl mx-auto">
                    {/* Model Selection */}
                    <div className="flex items-center justify-center mb-6">
                        <div className="relative">
                            <Button
                                variant="outline"
                                className={`flex items-center gap-3 text-sm bg-gradient-to-r ${selectedModel.color} text-white border-0 hover:shadow-lg px-6 py-3 rounded-xl shadow-md transition-all duration-300 hover:scale-105`}
                                onClick={() => setShowModelDropdown(!showModelDropdown)}
                                disabled={!isConnected}
                            >
                                <span className="text-lg">{selectedModel.icon}</span>
                                <span className="font-medium">{selectedModel.name}</span>
                                <ChevronDown className="h-4 w-4 ml-1" />
                            </Button>
                            {showModelDropdown && (
                                <div className="absolute bottom-full mb-2 left-0 bg-white/95 backdrop-blur-sm border border-gray-200/50 rounded-xl shadow-2xl min-w-80 z-10 overflow-hidden">
                                    {models.map((model) => (
                                        <button
                                            key={model.id}
                                            className={`w-full text-left px-6 py-4 hover:bg-gray-50 transition-all duration-200 first:rounded-t-xl last:rounded-b-xl border-l-4 hover:border-l-8 ${selectedModel.id === model.id
                                                ? `bg-gradient-to-r ${model.color} text-white border-l-white`
                                                : 'border-l-transparent hover:border-l-blue-400'
                                                }`}
                                            onClick={() => {
                                                setSelectedModel(model)
                                                setShowModelDropdown(false)
                                            }}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${selectedModel.id === model.id
                                                    ? 'bg-white/20'
                                                    : `bg-gradient-to-br ${model.color} text-white shadow-lg`
                                                    }`}>
                                                    {model.icon}
                                                </div>
                                                <div>
                                                    <div className={`font-semibold ${selectedModel.id === model.id ? 'text-white' : 'text-gray-900'}`}>
                                                        {model.name}
                                                    </div>
                                                    <div className={`text-sm ${selectedModel.id === model.id ? 'text-white/80' : 'text-gray-600'}`}>
                                                        {model.description}
                                                    </div>
                                                </div>
                                                {selectedModel.id === model.id && (
                                                    <div className="ml-auto">
                                                        <div className="w-3 h-3 bg-white rounded-full"></div>
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Enhanced Message Input */}
                    <div className="relative">
                        <Textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder={isConnected ? "Type your message... (Press Enter to send, Shift+Enter for new line)" : "Connecting..."}
                            className="min-h-14 max-h-32 pr-20 pl-6 py-4 resize-none border-0 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg placeholder:text-gray-500 text-base leading-relaxed focus:bg-white/90 focus:shadow-xl focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                            disabled={!isConnected}
                        />
                        <div className="absolute right-3 bottom-3 flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-9 w-9 p-0 hover:bg-gray-100 rounded-xl transition-all duration-200"
                                disabled={!isConnected}
                            >
                                <Paperclip className="h-4 w-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-9 w-9 p-0 hover:bg-gray-100 rounded-xl transition-all duration-200"
                                disabled={!isConnected}
                            >
                                <Mic className="h-4 w-4" />
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => sendMessage()}
                                disabled={!input.trim() || !isConnected}
                                className="h-9 w-9 p-0 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 hover:scale-105"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center justify-center mt-4 text-sm text-gray-500">
                        <span>
                            {isConnected ? '✨ AI can make mistakes. Please verify important information.' : '🔌 Disconnected'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
} 