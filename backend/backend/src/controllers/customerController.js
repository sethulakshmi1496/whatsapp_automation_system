const { Customer } = require('../models');
const { Op } = require('sequelize');

exports.getAll = async (req, res) => {
    try {
        const adminId = req.user.id; // From auth middleware
        console.log('[customerController] getAll called for adminId:', adminId);

        // Get customers for this admin only, exclude admin's own entry
        const customers = await Customer.findAll({
            where: {
                adminId,
                tags: {
                    [Op.or]: [
                        { [Op.not]: { [Op.contains]: ['whatsapp-connected'] } },
                        { [Op.is]: null }
                    ]
                }
            },
            order: [['createdAt', 'DESC']],
            limit: 200
        });

        console.log('[customerController] Found', customers.length, 'customers for admin', adminId);
        return res.json({ ok: true, customers });
    } catch (error) {
        console.error('[customerController] getAll error:', error);
        return res.status(500).json({ ok: false, error: error.message });
    }
};

exports.create = async (req, res) => {
    try {
        const adminId = req.user.id;
        const customer = await Customer.create({ ...req.body, adminId });
        res.json(customer);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        const adminId = req.user.id;
        await Customer.update(req.body, {
            where: { id: req.params.id, adminId }
        });
        res.json({ message: 'Updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const adminId = req.user.id;
        await Customer.destroy({
            where: { id: req.params.id, adminId }
        });
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.import = async (req, res) => {
    const customers = req.body;
    try {
        const adminId = req.user.id;
        if (!Array.isArray(customers)) return res.status(400).json({ message: 'Invalid format' });

        // Add adminId to all customers
        const customersWithAdmin = customers.map(c => ({ ...c, adminId }));

        await Customer.bulkCreate(customersWithAdmin, {
            updateOnDuplicate: ['name', 'email', 'tags']
        });
        res.json({ message: 'Imported successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
