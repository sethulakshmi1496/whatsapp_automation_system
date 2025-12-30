const { WhatsappAuth } = require('../models');
const { BufferJSON, initAuthCreds } = require('@whiskeysockets/baileys');

const useMySQLAuthState = async (adminId) => {
    // 1. Load credentials
    const writeData = async (data, key) => {
        try {
            await WhatsappAuth.upsert({
                adminId,
                key,
                value: JSON.stringify(data, BufferJSON.replacer)
            });
        } catch (error) {
            console.error('Error writing auth data:', error);
        }
    };

    const readData = async (key) => {
        try {
            const data = await WhatsappAuth.findOne({ where: { adminId, key } });
            if (data) {
                return JSON.parse(data.value, BufferJSON.reviver);
            }
            return null;
        } catch (error) {
            console.error('Error reading auth data:', error);
            return null;
        }
    };

    const removeData = async (key) => {
        try {
            await WhatsappAuth.destroy({ where: { adminId, key } });
        } catch (error) {
            console.error('Error removing auth data:', error);
        }
    };

    const creds = (await readData('creds')) || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(
                        ids.map(async (id) => {
                            let value = await readData(`${type}-${id}`);
                            if (type === 'app-state-sync-key' && value) {
                                value = BufferJSON.reviver(null, value);
                            }
                            if (value) {
                                data[id] = value;
                            }
                        })
                    );
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            if (value) {
                                tasks.push(writeData(value, key));
                            } else {
                                tasks.push(removeData(key));
                            }
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: () => writeData(creds, 'creds')
    };
};

module.exports = { useMySQLAuthState };
