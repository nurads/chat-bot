import { useEffect, useState } from 'react'
import { Bot } from 'lucide-react'

interface TypingIndicatorProps {
    isVisible: boolean
}

export default function TypingIndicator({ isVisible }: TypingIndicatorProps) {
    const [dots, setDots] = useState('')

    useEffect(() => {
        if (!isVisible) {
            setDots('')
            return
        }

        const interval = setInterval(() => {
            setDots(prev => {
                if (prev === '...') return ''
                return prev + '.'
            })
        }, 500)

        return () => clearInterval(interval)
    }, [isVisible])

    if (!isVisible) return null

    return (
        <div className="w-full border-b border-gray-100 bg-gray-50">
            <div className="max-w-3xl mx-auto px-4 py-6">
                <div className="flex gap-6">
                    <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-sm flex items-center justify-center bg-green-500 text-white">
                            <Bot className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                            <span className="text-gray-500 text-sm">AI is typing</span>
                            <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                            <span className="text-gray-400 font-mono w-6">{dots}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
} 