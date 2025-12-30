const { Template } = require('../models');

exports.getAll = async (req, res) => {
    try {
        const templates = await Template.findAll();
        res.json(templates);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.create = async (req, res) => {
    try {
        const template = await Template.create(req.body);
        res.json(template);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.update = async (req, res) => {
    try {
        await Template.update(req.body, { where: { id: req.params.id } });
        res.json({ message: 'Updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.delete = async (req, res) => {
    try {
        await Template.destroy({ where: { id: req.params.id } });
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
