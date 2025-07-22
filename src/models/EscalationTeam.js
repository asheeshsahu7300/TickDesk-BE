const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const escalationLevelSchema = new Schema({
    level: { type: Number, required: true },
    description: { type: String },
    team_id: { type: Schema.Types.ObjectId, ref: 'EscalationTeam' }, 
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});


const escalationTeamSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    escalation_levels: [escalationLevelSchema],
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

const EscalationTeam = mongoose.model('EscalationTeam', escalationTeamSchema);
module.exports = EscalationTeam;
