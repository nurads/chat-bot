import { useState, useEffect, useRef } from 'react'
import { Send, Bot, User, Copy, ThumbsUp, ThumbsDown, ChevronDown, Paperclip, Mic } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useChat } from '@/contexts/ChatContext'
import TypingIndicator from './TypingIndicator'

const API_URL = import.meta.env.VITE_API_URL

interface Message {
    id: string
    content: string
    role: 'user' | 'assistant'
    createdAt: string
}

const models = [
    { id: 'gpt-4', name: 'GPT-4', description: 'Most capable model' },
    { id: 'gpt-3.5', name: 'GPT-3.5', description: 'Fast and efficient' },
    { id: 'claude', name: 'Claude', description: 'Anthropic\'s model' }
]

export default function ChatArea() {
    const [input, setInput] = useState('')
    const [selectedModel, setSelectedModel] = useState(models[0])
    const [showModelDropdown, setShowModelDropdown] = useState(false)
    const {
        currentConversationId,
        messages,
        isAITyping,
        streamingMessage,
        sendMessage: sendSocketMessage,
        isConnected
    } = useChat()
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        scrollToBottom()
    }, [messages, streamingMessage, isAITyping])

    useEffect(() => {
        // Auto-resize textarea
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
        }
    }, [input])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const sendMessage = () => {
        if (!input.trim() || !currentConversationId || !isConnected) return

        const messageToSend = input.trim()
        setInput('') // Clear input immediately
        sendSocketMessage(messageToSend)
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    const copyMessage = (content: string) => {
        navigator.clipboard.writeText(content)
    }

    if (!currentConversationId) {
        return (
            <div className="flex-1 flex flex-col bg-white">
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-2xl mx-auto p-8">
                        <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                            <Bot className="h-10 w-10 text-gray-600" />
                        </div>
                        <h1 className="text-3xl font-semibold text-gray-800 mb-4">How can I help you today?</h1>
                        {/* Connection status */}
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm mb-8 ${isConnected
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                            }`}>
                            <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'
                                }`}></div>
                            {isConnected ? 'Connected' : 'Connecting...'}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                            <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                <h3 className="font-medium text-gray-800 mb-2">Write & Debug Code</h3>
                                <p className="text-sm text-gray-600">Get help with programming tasks and debugging</p>
                            </div>
                            <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                <h3 className="font-medium text-gray-800 mb-2">Analyze Data</h3>
                                <p className="text-sm text-gray-600">Process and interpret your data</p>
                            </div>
                            <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                <h3 className="font-medium text-gray-800 mb-2">Creative Writing</h3>
                                <p className="text-sm text-gray-600">Generate stories, poems, and creative content</p>
                            </div>
                            <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                                <h3 className="font-medium text-gray-800 mb-2">Answer Questions</h3>
                                <p className="text-sm text-gray-600">Get detailed explanations on any topic</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Input Area - Always visible */}
                <div className="border-t border-gray-200 bg-white p-4">
                    <div className="max-w-4xl mx-auto">
                        {/* Model Selection */}
                        <div className="flex items-center justify-center mb-4">
                            <div className="relative">
                                <Button
                                    variant="outline"
                                    className="flex items-center gap-2 text-sm"
                                    onClick={() => setShowModelDropdown(!showModelDropdown)}
                                    disabled={!isConnected}
                                >
                                    <span>{selectedModel.name}</span>
                                    <ChevronDown className="h-3 w-3" />
                                </Button>
                                {showModelDropdown && (
                                    <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg min-w-64 z-10">
                                        {models.map((model) => (
                                            <button
                                                key={model.id}
                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                                                onClick={() => {
                                                    setSelectedModel(model)
                                                    setShowModelDropdown(false)
                                                }}
                                            >
                                                <div className="font-medium text-sm">{model.name}</div>
                                                <div className="text-xs text-gray-500">{model.description}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Message Input */}
                        <div className="relative">
                            <Textarea
                                ref={textareaRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder={isConnected ? "Message ChatGPT..." : "Connecting..."}
                                className="min-h-12 max-h-32 pr-12 resize-none border-gray-300 focus:border-gray-400 focus:ring-0"
                                disabled={!isConnected}
                            />
                            <div className="absolute right-2 bottom-2 flex items-center gap-1">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    disabled={!isConnected}
                                >
                                    <Paperclip className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    disabled={!isConnected}
                                >
                                    <Mic className="h-4 w-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={sendMessage}
                                    disabled={!input.trim() || !isConnected}
                                    className="h-8 w-8 p-0"
                                >
                                    <Send className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                            <span>
                                {isConnected ? 'ChatGPT can make mistakes. Check important info.' : 'Disconnected'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-col bg-white h-full">
            {/* Connection Status */}
            {!isConnected && (
                <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
                    <div className="flex items-center text-yellow-800">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse"></div>
                        <span className="text-sm">Reconnecting to server...</span>
                    </div>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="w-full">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`w-full border-b border-gray-100 ${message.role === 'assistant' ? 'bg-gray-50' : 'bg-white'
                                    }`}
                            >
                                <div className="max-w-3xl mx-auto px-4 py-6">
                                    <div className="flex gap-6">
                                        <div className="flex-shrink-0">
                                            <div className={`w-8 h-8 rounded-sm flex items-center justify-center ${message.role === 'assistant'
                                                ? 'bg-green-500 text-white'
                                                : 'bg-blue-500 text-white'
                                                }`}>
                                                {message.role === 'assistant' ? (
                                                    <Bot className="h-5 w-5" />
                                                ) : (
                                                    <User className="h-4 w-4" />
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="prose prose-sm max-w-none">
                                                <p className="text-gray-800 leading-7 whitespace-pre-wrap m-0">
                                                    {message.content}
                                                    {message.id.startsWith('temp-') && (
                                                        <span className="inline-block w-2 h-5 bg-blue-400 ml-1 animate-pulse"></span>
                                                    )}
                                                </p>
                                            </div>
                                            {message.role === 'assistant' && !message.id.startsWith('temp-') && (
                                                <div className="flex items-center gap-2 mt-4 text-gray-500">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2 hover:bg-gray-200"
                                                        onClick={() => copyMessage(message.content)}
                                                    >
                                                        <Copy className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2 hover:bg-gray-200"
                                                    >
                                                        <ThumbsUp className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 px-2 hover:bg-gray-200"
                                                    >
                                                        <ThumbsDown className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Streaming Message */}
                        {streamingMessage && (
                            <div className="w-full border-b border-gray-100 bg-gray-50">
                                <div className="max-w-3xl mx-auto px-4 py-6">
                                    <div className="flex gap-6">
                                        <div className="flex-shrink-0">
                                            <div className="w-8 h-8 rounded-sm flex items-center justify-center bg-green-500 text-white">
                                                <Bot className="h-5 w-5" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="prose prose-sm max-w-none">
                                                <p className="text-gray-800 leading-7 whitespace-pre-wrap m-0">
                                                    {streamingMessage}
                                                    <span className="inline-block w-2 h-5 bg-gray-400 ml-1 animate-pulse"></span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* AI Typing Indicator */}
                        <TypingIndicator isVisible={isAITyping && !streamingMessage} />

                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 bg-white p-4">
                <div className="max-w-4xl mx-auto">
                    {/* Model Selection */}
                    <div className="flex items-center justify-center mb-4">
                        <div className="relative">
                            <Button
                                variant="outline"
                                className="flex items-center gap-2 text-sm"
                                onClick={() => setShowModelDropdown(!showModelDropdown)}
                                disabled={!isConnected}
                            >
                                <span>{selectedModel.name}</span>
                                <ChevronDown className="h-3 w-3" />
                            </Button>
                            {showModelDropdown && (
                                <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg min-w-64 z-10">
                                    {models.map((model) => (
                                        <button
                                            key={model.id}
                                            className="w-full text-left px-4 py-3 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                                            onClick={() => {
                                                setSelectedModel(model)
                                                setShowModelDropdown(false)
                                            }}
                                        >
                                            <div className="font-medium text-sm">{model.name}</div>
                                            <div className="text-xs text-gray-500">{model.description}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Message Input */}
                    <div className="relative">
                        <Textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder={isConnected ? "Message ChatGPT..." : "Connecting..."}
                            className="min-h-12 max-h-32 pr-12 resize-none border-gray-300 focus:border-gray-400 focus:ring-0"
                            disabled={!isConnected}
                        />
                        <div className="absolute right-2 bottom-2 flex items-center gap-1">
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                disabled={!isConnected}
                            >
                                <Paperclip className="h-4 w-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                disabled={!isConnected}
                            >
                                <Mic className="h-4 w-4" />
                            </Button>
                            <Button
                                size="sm"
                                onClick={sendMessage}
                                disabled={!input.trim() || !isConnected}
                                className="h-8 w-8 p-0"
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                        <span>
                            {isConnected ? 'ChatGPT can make mistakes. Check important info.' : 'Disconnected'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
} 