const { MessageCategory } = require('../models');

exports.getAll = async (req, res) => {
    const adminId = req.user?.id;
    if (!adminId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const categories = await MessageCategory.findAll({
            where: { adminId },
            order: [['category', 'ASC'], ['createdAt', 'ASC']]
        });
        res.json(categories);
    } catch (err) {
        console.error('[messageCategoryController] getAll error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getByCategory = async (req, res) => {
    const adminId = req.user?.id;
    const { category } = req.params;
    if (!adminId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const messages = await MessageCategory.findAll({
            where: { adminId, category },
            order: [['createdAt', 'ASC']]
        });
        res.json(messages);
    } catch (err) {
        console.error('[messageCategoryController] getByCategory error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    const adminId = req.user?.id;
    const { category, title, body } = req.body;
    if (!adminId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const message = await MessageCategory.create({
            adminId,
            category,
            title,
            body
        });
        res.json({ ok: true, message });
    } catch (err) {
        console.error('[messageCategoryController] create error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.update = async (req, res) => {
    const adminId = req.user?.id;
    const { id } = req.params;
    const { category, title, body } = req.body;
    if (!adminId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const message = await MessageCategory.findOne({ where: { id, adminId } });
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }
        await message.update({ category, title, body });
        res.json({ ok: true, message });
    } catch (err) {
        console.error('[messageCategoryController] update error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.delete = async (req, res) => {
    const adminId = req.user?.id;
    const { id } = req.params;
    if (!adminId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const message = await MessageCategory.findOne({ where: { id, adminId } });
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }
        await message.destroy();
        res.json({ ok: true });
    } catch (err) {
        console.error('[messageCategoryController] delete error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getCategories = async (req, res) => {
    const adminId = req.user?.id;
    if (!adminId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const categories = await MessageCategory.findAll({
            where: { adminId },
            attributes: ['category'],
            group: ['category']
        });
        const uniqueCategories = categories.map(c => c.category);
        res.json(uniqueCategories);
    } catch (err) {
        console.error('[messageCategoryController] getCategories error:', err);
        res.status(500).json({ error: err.message });
    }
};
