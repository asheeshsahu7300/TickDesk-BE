const EscalationThreshold = require('../models/EscalationThreshold');
const Ticket = require('../models/Ticket');

const escalationChecker = async (req, res, next) => {
    try {
        // Skip if the ticket is already escalated or closed
        if (req.ticket && (req.ticket.isEscalated || ['resolved', 'closed'].includes(req.ticket.status))) {
            return next();
        }

        // Get the ticket either from the request body (for new tickets) or from the URL params
        const ticketId = req.params.id || (req.body.ticket && req.body.ticket._id);
        if (!ticketId) {
            return next();
        }

        const ticket = await Ticket.findById(ticketId);
        if (!ticket) {
            return next();
        }

        // Get threshold for the ticket's priority
        const threshold = await EscalationThreshold.findOne({ priority: ticket.priority });
        if (!threshold) {
            console.warn(`No escalation threshold found for priority: ${ticket.priority}`);
            return next();
        }

        // Calculate ticket age in hours
        const ticketAge = (Date.now() - ticket.createdAt) / (1000 * 60 * 60);

        // Check if ticket exceeds threshold
        if (ticketAge > threshold.hours) {
            ticket.needsEscalation = true;
            ticket.escalationReason = `Ticket exceeded ${threshold.hours} hours threshold for ${ticket.priority} priority`;
            await ticket.save();
        }

        // Add escalation info to request object
        req.escalationInfo = {
            needsEscalation: ticket.needsEscalation,
            threshold: threshold.hours,
            ticketAge,
            priority: ticket.priority
        };

        next();
    } catch (error) {
        console.error('Error in escalation checker middleware:', error);
        // Don't block the request if escalation check fails
        next();
    }
};

// Schedule checker for periodic checks of all tickets
const scheduleEscalationChecks = async () => {
    try {
        // Get all active tickets that aren't escalated
        const tickets = await Ticket.find({
            status: { $nin: ['resolved', 'closed'] },
            isEscalated: false
        });

        const thresholds = await EscalationThreshold.find();
        const thresholdMap = new Map(thresholds.map(t => [t.priority, t.hours]));

        for (const ticket of tickets) {
            const threshold = thresholdMap.get(ticket.priority);
            if (!threshold) {
                continue;
            }

            const ticketAge = (Date.now() - ticket.createdAt) / (1000 * 60 * 60);
            
            if (ticketAge > threshold) {
                ticket.needsEscalation = true;
                ticket.escalationReason = `Ticket exceeded ${threshold} hours threshold for ${ticket.priority} priority`;
                await ticket.save();
            }
        }
    } catch (error) {
        console.error('Error in scheduled escalation check:', error);
    }
};

module.exports = {
    escalationChecker,
    scheduleEscalationChecks
};