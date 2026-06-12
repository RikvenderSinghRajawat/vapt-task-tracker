const ApiKey = require('../models/ApiKey');

const maskKey = (key) => {
  if (key.length <= 8) return key;
  return '****' + key.slice(-8);
};

exports.getApiKeys = async (req, res, next) => {
  try {
    const keys = await ApiKey.find({ user: req.user._id }).sort('-createdAt');
    const masked = keys.map(k => ({
      _id: k._id,
      name: k.name,
      key: maskKey(k.key),
      permissions: k.permissions,
      lastUsed: k.lastUsed,
      expiresAt: k.expiresAt,
      isActive: k.isActive,
      createdAt: k.createdAt,
    }));
    res.json({ success: true, data: masked });
  } catch (error) {
    next(error);
  }
};

exports.createApiKey = async (req, res, next) => {
  try {
    const { name, permissions, expiresAt } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    const key = ApiKey.generateKey();
    const apiKey = await ApiKey.create({
      user: req.user._id,
      name,
      key,
      permissions: permissions || ['read'],
      expiresAt: expiresAt || null,
    });
    res.status(201).json({
      success: true,
      data: {
        _id: apiKey._id,
        name: apiKey.name,
        key: apiKey.key,
        permissions: apiKey.permissions,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
      message: 'Make sure to copy the key now. You will not be able to see it again.',
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteApiKey = async (req, res, next) => {
  try {
    const key = await ApiKey.findOne({ _id: req.params.id, user: req.user._id });
    if (!key) {
      return res.status(404).json({ success: false, message: 'API key not found' });
    }
    await key.deleteOne();
    res.json({ success: true, message: 'API key deleted' });
  } catch (error) {
    next(error);
  }
};

exports.revokeApiKey = async (req, res, next) => {
  try {
    const key = await ApiKey.findOne({ _id: req.params.id, user: req.user._id });
    if (!key) {
      return res.status(404).json({ success: false, message: 'API key not found' });
    }
    key.isActive = !key.isActive;
    await key.save();
    res.json({ success: true, data: { _id: key._id, isActive: key.isActive } });
  } catch (error) {
    next(error);
  }
};
