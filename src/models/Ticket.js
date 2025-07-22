const mongoose = require('mongoose');
const ticketConversation = require('./ticketConversation');
const Schema = mongoose.Schema;

// Define attachment schema
const attachmentSchema = new Schema({
    file_url: { type: String },
    file_name: { type: String },
    file_type: { type: String },
    file_size: { type: Number },
    uploaded_at: { type: Date, default: Date.now }
});

// Define ticket conversation schema




// Define escalation schema
const escalationSchema = new Schema({
  isEscalated: { type: Boolean, default: false },
  escalatedAt: { type: Date },
  reason: { type: String },
  level: {type:Number},
  escalatedBy: { 
    type: mongoose.Schema.Types.Mixed, 
    required: true,
    validate: {
        validator: function(value) {
            // Allow either an ObjectId or the string 'system'
            return mongoose.Types.ObjectId.isValid(value) || value === 'System';
        },
        message: props => `${props.value} is not a valid user ID or system identifier`
    }
},

  escalationTeam: { type: Schema.Types.ObjectId, ref: 'EscalationTeam' },
  lastEscalationAttempt: { type: Date },
  escalationHistory: [
    {
      timestamp: { type: Date, default: Date.now },
      type: { type: String, enum: ['manual', 'automatic'], default: 'manual' },
      reason: { type: String },
      priority: { type: String },
      performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      previousAssignee: { type: Schema.Types.ObjectId, ref: 'User' }
    }
  ]
});

// Define auto-assignee mapping based on category  and subcategory
const autoAssigneeMapping = {
    '6776bcb815fff2a23662a7b2': { // Example category ID
        '64b7e89f12fbcf12a5c9e89a': '677550c4cbe90adfdec61be9',  // Example user ID for subcategory 1
        '6776bcb815fff2a23662a7b4': '677550c4cbe90adfdec61beA'   // Example user ID for subcategory 2
    },
    // Add more mappings as needed
};

// Define ticket schema
const ticketSchema = new mongoose.Schema({
   
    ticket_raised_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, 
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    subcategory: { type: String },
    description: { type: String, required: true },
    attachments: [attachmentSchema],
    priority: { type: String, enum: ['Low', 'Medium', 'High', 'Urgent'], required: true },
    status: { type: String, enum: ['Open', 'In Progress', 'Resolved', 'Closed'], default: 'Open' },
    assignee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        
    },
   conversations:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'TicketConversation' }], 
    escalation: {type: escalationSchema, default: () => ({})} , 
    resolution_details: {
        resolved_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        resolution_description: { type: String },
        resolved_at: { type: Date }
    },
    closure_details: {
        closed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        closure_reason: { type: String },
        assurance: { type: Boolean, default: false },
        closed_at: { type: Date }
    },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

// Pre-save hook to auto-assign based on category and subcategory
ticketSchema.pre('save', async function (next) {
    const ticket = this;

    // If the category is populated, use its _id field
    const categoryId = ticket.category._id ? ticket.category._id.toString() : ticket.category.toString();

    // Find the subcategory _id based on its name or use the raw subcategory field if not populated
    let subcategoryId = ticket.subcategory;

    // If category is populated and subcategories are available
    if (ticket.category.subcategories && Array.isArray(ticket.category.subcategories)) {
        const matchingSubcategory = ticket.category.subcategories.find(
            (sub) => sub._id.toString() === subcategoryId.toString()
        );
        if (matchingSubcategory) {
            subcategoryId = matchingSubcategory._id.toString();
        }
    }

    console.log('Normalized Category:', categoryId);
    console.log('Normalized Subcategory:', subcategoryId);

    // Check autoAssigneeMapping for category and subcategory
    if (autoAssigneeMapping[categoryId] && autoAssigneeMapping[categoryId][subcategoryId]) {
        ticket.assignee = new mongoose.Types.ObjectId(autoAssigneeMapping[categoryId][subcategoryId]);
        console.log('Assigned to:', ticket.assignee);
    } else {
        ticket.assignee = null; // Or assign a default user ID
        console.log('No mapping found, assignee set to null');
    }

    next();
});


// Indexing for faster queries by user_id and created_at
ticketSchema.index({ user_id: 1, created_at: 1 });

// Export models
module.exports = mongoose.model('Ticket', ticketSchema);
