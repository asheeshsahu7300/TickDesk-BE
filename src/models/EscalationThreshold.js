const mongoose = require('mongoose');

const escalationThresholdSchema = new mongoose.Schema({
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], required: true },
    hours: { type: Number, required: true }
});

module.exports = mongoose.model('EscalationThreshold', escalationThresholdSchema);
