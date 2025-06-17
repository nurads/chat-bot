import { Router } from 'express';
import { chatController } from '../controllers/chatController';

const router = Router();

// GET /api/chat/conversations - Get all conversations
router.get('/c', chatController.getConversations);

// GET /api/chat/conversations/:conversationId/messages - Get messages for a conversation
router.get('/c/:conversationId/messages', chatController.getMessages);

router.delete('/c/:conversationId', chatController.deleteConversation);
// POST /api/chat/send - Send a message and get AI response
router.post('/c/send', chatController.sendMessage);

// POST /api/chat/conversations - Create a new conversation
router.post('/c', chatController.createConversation);

export default router; 