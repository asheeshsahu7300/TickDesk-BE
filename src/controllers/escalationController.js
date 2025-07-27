const Ticket = require('../models/Ticket');
const EscalationThreshold = require('../models/EscalationThreshold');
const EscalationTeam = require('../models/EscalationTeam');

class EscalationController {
    constructor() {
        this.checkEscalationStatus = this.checkEscalationStatus.bind(this);
        this.autoEscalate = this.autoEscalate.bind(this);
    }
    // Check if ticket needs escalation based on priority and age
    async checkEscalationStatus(ticket) {
        try {
            // Find the escalation threshold based on the ticket's priority
            const threshold = await EscalationThreshold.findOne({ priority: ticket.priority });
            if (!threshold) {
                throw new Error(`No threshold defined for priority: ${ticket.priority}`);
            }
    
            // Determine the current escalation level
            let level = ticket.escalation.level || 1;
    
            // Calculate the ticket's age in hours
            const ticketAge = (Date.now() - ticket.created_at) / (1000 * 60 * 60);
    
            // Determine if the ticket needs escalation
            let needsEscalation = false;
            let reason = null;
    
            if (!ticket.escalation.iEscalated) {
                // If the ticket is not yet escalated, check if it exceeds the threshold for the first escalation
                if (ticketAge > threshold.hours) {
                    needsEscalation = true;
                    reason = "Escalation threshold for ticket exceeds";
                }
            } else {
                // If already escalated, check if more than the threshold hours have passed since the last escalation
                const escalationAge = (Date.now() - new Date(ticket.escalation.escalatedAt).getTime()) / (1000 * 60 * 60);
                if (escalationAge > threshold.hours) {
                    needsEscalation = true;
                    level += 1; // Move to the next escalation level
                    reason = "Ticket not resolved even after escalation";
                }
            }
    
            // Find the escalation team for the determined level
            const escalationTeam = await EscalationTeam.findOne({ 'escalation_levels.level': level });
            if (!escalationTeam) {
                throw new Error(`No escalation team found for level ${level}`);
            }
    
            return {
                needsEscalation,
                reason,
                level,
                escalationTeam,
            };
        } catch (error) {
            throw new Error(`Error checking escalation status: ${error.message}`);
        }
    }
    

    // Auto-escalate tickets that need attention
    async autoEscalate(req, res) {
        try {
            const tickets = await Ticket.find({
                status: { $nin: ['Resolved', 'Closed'] },
            }).populate('assignee', 'name email');
            
    
            const escalatedTickets = [];
            const errors = [];
    
            for (const ticket of tickets) {
                try {
                    // Check if the ticket needs initial escalation
                    const { needsEscalation, reason, level, escalationTeam } = await this.checkEscalationStatus(ticket);
    
                    if (!ticket.escalation.isEscalated) {
                        // Perform the first escalation
                        ticket.escalation.isEscalated = true;
                        ticket.escalation.escalatedAt = Date.now();
                        ticket.escalation.reason = reason;
                        ticket.escalation.level = level;
                        ticket.escalation.escalationTeam = escalationTeam;
                        ticket.escalation.escalatedBy = 'System';
                        ticket.escalation.lastEscalationAttempt = Date.now();
                        ticket.escalation.escalationHistory.push({
                            timestamp: Date.now(),
                            type: 'automatic',
                            reason,
                            priority: ticket.priority,
                            performed_by: "System",
                            previous_assignee: ticket.assignee,
                        });
    
                        await ticket.save();
                        escalatedTickets.push(ticket);
                    } else if (ticket.escalation.isEscalated) {
                        const lastEscalation = ticket.escalation.escalationHistory[ticket.escalation.escalationHistory.length - 1];
                        // Check if more than 24 hours have passed since the last escalation
                        const hoursSinceLastEscalation = (Date.now()-lastEscalation.timestamp) / (1000 * 60 * 60);
                       
                        if (hoursSinceLastEscalation >= 24) {
                            // Escalate to the next level

                            const nextLevel = ticket.escalation.level + 1;
                            console.log(nextLevel)
                            const escalationTeam = await EscalationTeam.findOne({
                                'escalation_levels.level': nextLevel,
                                
                            }).populate('members', 'name email');
                            
                            if (!escalationTeam) {
                                throw new Error(`No escalation team found for level ${nextLevel}`);
                            }
                           
                            ticket.escalation.level = nextLevel;
                            ticket.escalation.reason=`No resolution after 24 hours at the current level so update to  level ${nextLevel}`;
                            ticket.escalation.escalatedAt = Date.now();
                            ticket.escalation.escalationTeam = escalationTeam._id;
                            ticket.escalation.lastEscalationAttempt = Date.now();
                           
                            ticket.escalation.escalationHistory.push({
                                timestamp: Date.now(),
                                type: 'automatic',
                                reason: 'No resolution after 24 hours at the current level',
                                priority: ticket.priority,
                                performed_by:  'System',
                                previous_assignee: ticket.assignee,
                            });
                            
                            await ticket.save();
                            escalatedTickets.push(ticket)
                       
                        }
                    }
    
                    ticket.last_escalation_attempt = Date.now();
                    await ticket.save();
                } catch (error) {
                    errors.push({ ticketId: ticket._id, error: error.message });
                }
            }
    
            return res.status(200).json({
                success: true,
                message: `${escalatedTickets.length} tickets escalated`,
                data: {
                    escalatedTickets,
                    errors: errors.length ? errors : undefined,
                },
            });
        } catch (error) {
            
            return res.status(500).json({
              
                success: false,
                message: 'Error during auto-escalation',
                error: error.message,
            });
        }
    }
    

    // Manually escalate a specific ticket
    async manualEscalate(req, res) {
        try {
            const { ticket_id, reason, level } = req.body;

            const ticket = await Ticket.findById(ticket_id).populate(
              "assignee",
              "name email"
            );
            console.log(ticket);
            if (!ticket) {
              return res.status(404).json({
                success: false,
                message: "Ticket not found",
              });
            }
            const escalationTeam = await EscalationTeam.findOne({
              "escalation_levels.level": level,
            });

            console.log(typeof ticket.escalation);
            ticket.escalation.isEscalated = true;
            ticket.escalation.escalatedAt = Date.now();
            ticket.escalation.reason = reason;
            ticket.escalation.level = level + 1;
            ticket.escalation.escalatedBy = req.user._id;
            ticket.escalation.escalationTeam=escalationTeam._id
            ticket.escalation.lastEscalationAttempt = Date.now();
            ticket.escalation.escalationHistory.push({
                timestamp: Date.now(),
                type: 'manual',
                reason: reason,
                priority: ticket.priority,
                performedBy: req.user._id,
                previousAssignee: ticket.assignee
            });

            await ticket.save();

            return res.status(200).json({
                success: true,
                message: 'Ticket escalated successfully',
                data: ticket
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Error during manual escalation',
                error: error.message
            });
        }
    }

    // De-escalate a ticket
    async deEscalate(req, res) {
        try {
            const { ticketId, reason } = req.body;

            const ticket = await Ticket.findById(ticketId).populate('assignee', 'name email');
            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: 'Ticket not found'
                });
            }

            if (!ticket.isEscalated) {
                return res.status(400).json({
                    success: false,
                    message: 'Ticket is not escalated'
                });
            }

            ticket.isEscalated = false;
            
            ticket.deEscalatedAt = Date.now();
            ticket.deEscalationReason = reason;
            ticket.deEscalatedBy = req.user._id;
            ticket.escalationHistory.push({
                timestamp: Date.now(),
                type: 'de-escalation',
                reason: reason,
                priority: ticket.priority,
                performedBy: req.user._id,
                previousAssignee: ticket.assignee
            });

            await ticket.save();

            return res.status(200).json({
                success: true,
                message: 'Ticket de-escalated successfully',
                data: ticket
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Error during de-escalation',
                error: error.message
            });
        }
    }

    // Get escalation history for a ticket
    async getEscalationHistory(req, res) {
        try {
            const { ticketId } = req.params;

            const ticket = await Ticket.findById(ticketId)
                .populate('escalationHistory.performedBy', 'name email')
                .populate('escalationHistory.previousAssignee', 'name email')
                .populate('assignedTo', 'name email');

            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: 'Ticket not found'
                });
            }

            const threshold = await EscalationThreshold.findOne({ priority: ticket.priority });

            return res.status(200).json({
                success: true,
                data: {
                    currentStatus: {
                        isEscalated: ticket.isEscalated,
                        needsEscalation: ticket.needsEscalation,
                        priority: ticket.priority,
                        threshold: threshold ? threshold.hours : null,
                        assignedTo: ticket.assignedTo
                    },
                    escalationHistory: ticket.escalationHistory
                }
            });

        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Error fetching escalation history',
                error: error.message
            });
        }
    }
}

module.exports = new EscalationController();