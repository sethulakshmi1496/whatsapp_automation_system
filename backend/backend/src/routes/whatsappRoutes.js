const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/status', authMiddleware, whatsappController.getStatus);
router.post('/disconnect', authMiddleware, whatsappController.disconnect);
router.get('/qr', authMiddleware, whatsappController.getQr);
router.post('/reload', authMiddleware, whatsappController.reload);

module.exports = router;
