import { Router } from 'express';
import { chatController } from '../controllers/chatController';
import { authenticateToken } from '../middleware/auth';
const router = Router();

router.use(authenticateToken);
// GET /api/chat/conversations - Get all conversations
router.get('/c', chatController.getConversations);

// GET /api/chat/conversations/:conversationId/messages - Get messages for a conversation
router.get('/c/:conversationId/messages', chatController.getMessages);

// DELETE /api/chat/conversations/:conversationId - Delete a conversation
router.delete('/c/:conversationId', chatController.deleteConversation);


// POST /api/chat/conversations - Create a new conversation
router.post('/c', chatController.createConversation);

export default router;  