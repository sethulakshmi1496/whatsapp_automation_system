const whatsappService = require('../services/whatsappService');

exports.getStatus = (req, res) => {
    const adminId = req.user.id;
    res.json(whatsappService.getStatus(adminId));
};

exports.disconnect = async (req, res) => {
    const adminId = req.user.id;
    await whatsappService.disconnect(adminId);
    res.json({ message: 'Disconnected' });
};

exports.getQr = (req, res) => {
    const adminId = req.user.id;
    const qr = whatsappService.getQr(adminId);
    res.json({ qr });
};

exports.reload = async (req, res) => {
    const adminId = req.user.id;
    await whatsappService.forceReinit(adminId);
    res.json({ message: 'Reloading WhatsApp instance...' });
};
