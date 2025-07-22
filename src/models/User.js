const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: { 
        type: String, 
        required: true,
        trim: true,
        minlength: 2
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
    },
    password: { 
        type: String, 
        required: true,
        minlength: 6
    },
    role: { 
        type: String, 
        enum: ['employee', 'agent', 'admin'],
        required: true,
        default: 'employee'
    },
    team_id: { 
        type: Schema.Types.ObjectId, 
        ref: 'EscalationTeam',
        required: function() { return this.role === 'agent'; }
    },
    refreshToken: { 
        type: String, 
       
        
    },
    lastLogin: { type: Date },
    resetToken: { type: String }, // Field to store the reset token
    resetTokenExpiry: { type: Date },
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;