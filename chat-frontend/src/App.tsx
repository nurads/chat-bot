import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ChatProvider } from './contexts/ChatContext'
import ChatLayout from './components/ChatLayout'
import './index.css'

function App() {
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

export default App
