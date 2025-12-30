const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/conversations', chatController.getConversations);
router.get('/history/:phone', chatController.getMessages);

module.exports = router;
