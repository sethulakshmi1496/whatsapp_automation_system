const express = require('express');
const router = express.Router();
const messageCategoryController = require('../controllers/messageCategoryController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/', messageCategoryController.getAll);
router.get('/categories', messageCategoryController.getCategories);
router.get('/category/:category', messageCategoryController.getByCategory);
router.post('/', messageCategoryController.create);
router.put('/:id', messageCategoryController.update);
router.delete('/:id', messageCategoryController.delete);

module.exports = router;
