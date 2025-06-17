import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface User {
    id: string
    email: string
    name: string
}

interface AuthContextType {
    user: User | null
    token: string | null
    login: (email: string, password: string) => Promise<void>
    signup: (name: string, email: string, password: string) => Promise<void>
    logout: () => void
    isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [token, setToken] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    // Check for stored token on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('token')
        const storedUser = localStorage.getItem('user')

        if (storedToken && storedUser) {
            try {
                setToken(storedToken)
                setUser(JSON.parse(storedUser))
            } catch (error) {
                console.error('Error parsing stored user data:', error)
                localStorage.removeItem('token')
                localStorage.removeItem('user')
            }
        }
    }, [])

    // Listen for force logout events (e.g., from socket authentication failures)
    useEffect(() => {
        const handleForceLogout = (event: CustomEvent) => {
            console.log('AuthContext: Force logout triggered:', event.detail)
            logout()
        }

        // Type assertion for custom event
        window.addEventListener('auth:force-logout', handleForceLogout as EventListener)

        return () => {
            window.removeEventListener('auth:force-logout', handleForceLogout as EventListener)
        }
    }, [])

    const login = async (email: string, password: string) => {
        setIsLoading(true)
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
            const response = await fetch(`${API_URL}/api/users/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Login failed')
            }

            const data = await response.json()
            const newUser = {
                id: data.id,
                email: data.email,
                name: data.username || email.split('@')[0]
            }

            setUser(newUser)
            setToken(data.token)

            // Store in localStorage
            localStorage.setItem('token', data.token)
            localStorage.setItem('user', JSON.stringify(newUser))
        } catch (error) {
            console.error('Login failed:', error)
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const signup = async (name: string, email: string, password: string) => {
        setIsLoading(true)
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
            const response = await fetch(`${API_URL}/api/users/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: name, email, password }),
            })

            console.log(response.ok)

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Signup failed')
            }

            const data = await response.json()

            const newUser = {
                id: data.id,
                email: data.email,
                name: data.username || name
            }

            setUser(newUser)
            setToken(data.token)

            // Store in localStorage
            localStorage.setItem('token', data.token)
            localStorage.setItem('user', JSON.stringify(newUser))
        } catch (error) {
            console.error('Signup failed:', error)
            throw error
        } finally {
            setIsLoading(false)
        }
    }

    const logout = () => {
        setUser(null)
        setToken(null)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
    }

    return (
        <AuthContext.Provider value={{
            user,
            token,
            login,
            signup,
            logout,
            isLoading
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
} 