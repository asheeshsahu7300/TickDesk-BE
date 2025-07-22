const Ticket = require('../models/Ticket');
const TicketConversation = require('../models/ticketConversation');

class ResolutionController {
    constructor(){
        this.resolveTicket = this.resolveTicket.bind(this);
        this.closeTicket = this.closeTicket.bind(this);
        this._handleError = this._handleError.bind(this);
    }
    async resolveTicket(req, res) {
       
        try {
            const { resolution_description } = req.body;
            const ticket = await Ticket.findById(req.params.id);


            if (!ticket) {
                console.log("ticket!")
                return res.status(404).json({ error: 'Ticket not found' });
              
            }

            // Verify user is assignee
            if (!ticket.assignee.equals(req.user.id)) {
                return res.status(403).json({ error: 'Only assigned agent can resolve ticket' });
            }

            if (ticket.status === 'Closed') {
                return res.status(400).json({ error: 'Cannot resolve a closed ticket' });
            }

            // Update ticket resolution details
            ticket.status = 'Resolved';
            ticket.resolution_details = {
                resolved_by: req.user.id,
                resolution_description,
                resolved_at: Date.now()
            };
            ticket.updated_at = Date.now();

            // Add resolution conversation
            await this._addConversation(ticket._id, {
                sender: req.user.id,
                sender_type: 'User',
                sender_role: 'assignee',
                message: `Ticket resolved: ${resolution_description}`
            });

            await ticket.save();
            await this._notifyTicketResolution(ticket);

            res.json(await ticket.populate([
                { path: 'ticket_raised_by', select: 'name email' },
                { path: 'assignee', select: 'name email' },
                { path: 'resolution_details.resolved_by', select: 'name email' }
            ]));
        } catch (error) {
            this._handleError(res, error);
        }
    }

    async closeTicket(req, res) {
        try {
            const { closure_reason, assurance } = req.body;
            const ticket = await Ticket.findById(req.params.id);

            if (!ticket) {
                return res.status(404).json({ error: 'Ticket not found' });
            }

            // Verify ticket is resolved
            if (ticket.status !== 'Resolved') {
                return res.status(400).json({ error: 'Ticket must be resolved before closing' });
            }

            // Verify user is ticket raiser
            if (!ticket.ticket_raised_by.equals(req.user.id)) {
                return res.status(403).json({ error: 'Only ticket raiser can close the ticket' });
            }

            // Update closure details
            ticket.status = 'Closed';
            ticket.closure_details = {
                closed_by: req.user.id,
                closure_reason,
                assurance,
                closed_at: Date.now()
            };
            ticket.updated_at = Date.now();

            // Add closure conversation
            await this._addConversation(ticket._id, {
                sender: req.user.id,
                sender_type: 'User',
                sender_role: 'user',
                message: `Ticket closed. Reason: ${closure_reason}`
            });

            await ticket.save();
            await this._notifyTicketClosure(ticket);

            res.json(await ticket.populate([
                { path: 'ticket_raised_by', select: 'name email' },
                { path: 'assignee', select: 'name email' },
                { path: 'closure_details.closed_by', select: 'name email' }
            ]));
        } catch (error) {
            this._handleError(res, error);
        }
    }

    async rejectResolution(req, res) {
        try {
            const { reason } = req.body;
            const ticket = await Ticket.findById(req.params.id);

            if (!ticket) {
                return res.status(404).json({ error: 'Ticket not found' });
            }

            // Verify ticket is resolved
            if (ticket.status !== 'Resolved') {
                return res.status(400).json({ error: 'Can only reject resolved tickets' });
            }

            // Verify user is ticket raiser
            if (!ticket.ticket_raised_by.equals(req.user.id)) {
                return res.status(403).json({ error: 'Only ticket raiser can reject resolution' });
            }

            // Reset resolution details and reopen ticket
            ticket.status = 'Open';
            ticket.resolution_details = null;
            ticket.updated_at = Date.now();

            // Add rejection conversation
            await this._addConversation(ticket._id, {
                sender: req.user.id,
                sender_type: 'User',
                sender_role: 'user',
                message: `Resolution rejected. Reason: ${reason}`
            });

            await ticket.save();
            await this._notifyResolutionRejection(ticket, reason);

            res.json(await ticket.populate([
                { path: 'ticket_raised_by', select: 'name email' },
                { path: 'assignee', select: 'name email' }
            ]));
        } catch (error) {
            this._handleError(res, error);
        }
    }

    async getResolutionMetrics(req, res) {
        try {
            const startDate = new Date(req.query.startDate || new Date().setDate(new Date().getDate() - 30));
            const endDate = new Date(req.query.endDate || Date.now());

            const metrics = await Ticket.aggregate([
                {
                    $match: {
                        'resolution_details.resolved_at': {
                            $gte: startDate,
                            $lte: endDate
                        }
                    }
                },
                {
                    $group: {
                        _id: '$assignee',
                        total_resolutions: { $sum: 1 },
                        successful_closures: {
                            $sum: {
                                $cond: [{ $eq: ['$status', 'Closed'] }, 1, 0]
                            }
                        },
                        average_resolution_time: {
                            $avg: {
                                $subtract: ['$resolution_details.resolved_at', '$created_at']
                            }
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'agent_details'
                    }
                }
            ]);

            res.json(metrics);
        } catch (error) {
            this._handleError(res, error);
        }
    }

    // Helper to add conversations to a ticket
    async _addConversation(ticketId, conversationData) {
        const conversation = await TicketConversation.create({ ticket_id: ticketId, ...conversationData });
        await Ticket.findByIdAndUpdate(ticketId, { $push: { conversations: conversation._id } });
        return conversation;
    }

    // Notification handlers
    async _notifyTicketResolution(ticket) {
        console.log(`Ticket ${ticket._id} has been resolved`);
    }

    async _notifyTicketClosure(ticket) {
        console.log(`Ticket ${ticket._id} has been closed`);
    }

    async _notifyResolutionRejection(ticket, reason) {
        console.log(`Resolution for ticket ${ticket._id} was rejected: ${reason}`);
    }

    // Error handler
    _handleError(res, error) {
        console.error('Resolution Error:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                error: 'Validation Error',
                details: error.errors
            });
        }
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}

module.exports = new ResolutionController();
