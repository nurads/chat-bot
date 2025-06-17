import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ChatProvider } from './contexts/ChatContext'
import ChatLayout from './components/ChatLayout'
import AuthPage from './components/AuthPage'
import './index.css'

function AppContent() {
  const { user } = useAuth()

  if (!user) {
    return <AuthPage />
  }

  return (
    <ChatProvider>
      <Router>
        <div className="h-screen bg-background">
          <Routes>
            <Route path="/" element={<ChatLayout />} />
            <Route path="/chat/:conversationId" element={<ChatLayout />} />
          </Routes>
        </div>
      </Router>
    </ChatProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
