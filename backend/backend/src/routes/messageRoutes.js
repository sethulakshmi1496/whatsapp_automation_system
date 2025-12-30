const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/send', messageController.send);
router.post('/send-batch', messageController.sendBatch);
router.get('/logs', messageController.getLogs);

module.exports = router;
