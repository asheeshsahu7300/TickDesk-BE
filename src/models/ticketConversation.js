const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const attachmentSchema = new Schema({
    file_url: { type: String },
    file_name: { type: String },
    file_type: { type: String },
    file_size: { type: Number },
    uploaded_at: { type: Date, default: Date.now }
});

const ticketConversationSchema = new Schema({
    ticket_id: { 
        type: String, 
         unique:false,
        required: true,
        ref: 'Ticket',
        index: true // Add index for faster queries
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'sender_type',
        required: true
    },
    sender_type: {
        type: String,
        enum: ['User', 'EscalationTeam'],
        required: true
    },
    sender_role: {
        type: String,
        enum: ['user', 'assignee'],
        required: true
    },
    message: { type: String, required: true },
    attachments: [attachmentSchema],
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});


module.exports = mongoose.models.TicketConversation || mongoose.model('TicketConversation', ticketConversationSchema);
