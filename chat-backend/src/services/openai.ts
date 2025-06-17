import OpenAI from "openai";

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

export class OpenAIService {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }
    private async* createMockStream() {
        const mockResponses = [
            "I understand you'd like to chat!",
            "I'm here to help with any questions.",
            "What would you like to know?"
        ];

        const fullResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
        const words = fullResponse.split(' ');

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const isLast = i === words.length - 1;

            // Simulate OpenAI stream chunk format
            yield {
                choices: [{
                    delta: {
                        content: i === 0 ? word : ' ' + word
                    }
                }]
            };

            // Simulate streaming delay
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    async createCompletion(conversationHistory: ChatMessage[]) {
        // Add system message for better responses
        const systemMessage: ChatMessage = {
            role: 'system',
            content: 'You are a helpful AI assistant. Please provide helpful, accurate, and conversational responses. Keep responses reasonably concise but informative.'
        }

        const messages = [systemMessage, ...conversationHistory]

        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: messages,
            temperature: 0.7,
            max_tokens: 1500
        })

        return completion
    }

    async streamChatCompletion(messages: ChatMessage[], ws: WebSocket) {
        const openai = new OpenAI({
            apiKey: this.apiKey
        });

        const systemPrompt: ChatMessage = {
            role: 'system',
            content: 'Only ever reply with 3 lines maximum. Keep your responses concise and helpful.'
        };

        const fullMessages = [systemPrompt, ...messages];

        // const stream = this.createMockStream();

        const stream = await openai.chat.completions.create({
            model: 'gpt-4o', // or another model
            messages: fullMessages,
            stream: true,
            temperature: 0.7,
            max_tokens: 150,
        });

        return stream;
    }

    async createChatCompletion(messages: ChatMessage[]): Promise<string> {
        // Add the system prompt to limit responses to 3 lines
        const systemPrompt: ChatMessage = {
            role: 'system',
            content: 'Only ever reply with 3 lines maximum. Keep your responses concise and helpful.'
        };

        const fullMessages = [systemPrompt, ...messages];

        try {
            // Mock implementation - replace with actual OpenAI API call when needed
            const mockResponses = [
                "I understand you'd like to chat!\nI'm here to help with any questions.\nWhat would you like to know?",
                "That's a great question!\nLet me think about that for you.\nHere's what I think...",
                "Thanks for sharing that with me.\nI appreciate you taking the time.\nHow can I assist you further?",
                "I'm here to help you today.\nFeel free to ask me anything.\nWhat's on your mind?",
                "That's an interesting point!\nI appreciate your perspective.\nHow else can I assist?"
            ];

            const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            return randomResponse;

            /* 
            // Actual OpenAI implementation (uncomment when you install the openai package):
            
            import OpenAI from 'openai';
            
            const openai = new OpenAI({
              apiKey: this.apiKey,
            });
      
            const completion = await openai.chat.completions.create({
              model: "gpt-3.5-turbo",
              messages: fullMessages,
              max_tokens: 150,
              temperature: 0.7,
            });
      
            return completion.choices[0].message.content || "I apologize, but I couldn't generate a response.";
            */

        } catch (error) {
            console.error('OpenAI API error:', error);
            throw new Error('Failed to get response from OpenAI');
        }
    }

    // async * createChatCompletionStream(messages: ChatMessage[]): AsyncGenerator<string, void, unknown> {
    //     // Add the system prompt to limit responses to 3 lines
    //     const systemPrompt: ChatMessage = {
    //         role: 'system',
    //         content: 'Only ever reply with 3 lines maximum. Keep your responses concise and helpful.'
    //     };

    //     const fullMessages = [systemPrompt, ...messages];

    //     try {
    //         // Mock implementation - replace with actual OpenAI API call when needed
    //         const mockResponses = [
    //             "I understand you'd like to chat!\nI'm here to help with any questions.\nWhat would you like to know?",
    //             "That's a great question!\nLet me think about that for you.\nHere's what I think...",
    //             "Thanks for sharing that with me.\nI appreciate you taking the time.\nHow can I assist you further?",
    //             "I'm here to help you today.\nFeel free to ask me anything.\nWhat's on your mind?",
    //             "That's an interesting point!\nI appreciate your perspective.\nHow else can I assist?"
    //         ];

    //         const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];

    //         // Simulate streaming by sending chunks
    //         const words = randomResponse.split(' ');
    //         for (let i = 0; i < words.length; i++) {
    //             const chunk = i === 0 ? words[i] : ' ' + words[i];
    //             yield chunk;

    //             // Simulate streaming delay between chunks
    //             await new Promise(resolve => setTimeout(resolve, 100));
    //         }

    //         /* 
    //         // Actual OpenAI streaming implementation (uncomment when you install the openai package):

    //         import OpenAI from 'openai';

    //         const openai = new OpenAI({
    //           apiKey: this.apiKey,
    //         });

    //         const stream = await openai.chat.completions.create({
    //           model: "gpt-3.5-turbo",
    //           messages: fullMessages,
    //           max_tokens: 150,
    //           temperature: 0.7,
    //           stream: true,
    //         });

    //         for await (const chunk of stream) {
    //           const content = chunk.choices[0]?.delta?.content;
    //           if (content) {
    //             yield content;
    //           }
    //         }
    //         */

    //     } catch (error) {
    //         console.error('OpenAI API streaming error:', error);
    //         throw new Error('Failed to get streaming response from OpenAI');
    //     }
    // }
}

export const openaiService = new OpenAIService(process.env.OPENAI_API_KEY || ''); 