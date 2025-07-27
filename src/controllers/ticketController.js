const Ticket = require("../models/Ticket");
const TicketConversation = require("../models/Ticket");
const User = require("../models/User");
const Category = require("../models/Category");
const ticketConversation = require("../models/ticketConversation");
const { autoAssignTicket } = require("../services/autoAssignService");
const { suggestCategoryAI } = require("../services/aiAutoCategoryService");

class TicketController {
  constructor() {
    this.createTicket = this.createTicket.bind(this);
    this.getTickets = this.getTickets.bind(this);
    this.getTicketById = this.getTicketById.bind(this);
    this.addComment = this.addComment.bind(this);
    this.updateStatus = this.updateStatus.bind(this);
    this.escalateTicket = this.escalateTicket.bind(this);
  }
  async createTicket(req, res) {
    try {
      const { description, priority, attachments } = req.body;

      // Fetch all categories
      const categories = await Category.find({});

      // Use AI to suggest category
      const autoCategoryRaw = await suggestCategoryAI(description, categories);

      // Safely parse if wrapped in Markdown-style json block
      const cleanedCategory = autoCategoryRaw;

      const category = cleanedCategory?.categoryId || null;
      const subcategory = cleanedCategory?.subcategoryId || null;

      // Initial escalation setup
      const escalation = {
        isEscalated: false,
        escalatedAt: null,
        reason: "",
        level: null,
        escalatedBy: null,
        escalationTeam: null,
        lastEscalationAttempt: null,
        escalationHistory: [],
      };

      // Auto-assign using AI logic
      const assignment = await autoAssignTicket({
        category,
        subcategory,
        description,
      });

      let assignee = null;
      if (assignment?.teamId) {
        escalation.escalationTeam = assignment.teamId;
        escalation.level = 1;

        // Pick random agent from the team
        const teamAgents = await User.find({
          team_id: assignment.teamId,
          role: "agent",
          escalation_level: 1,
        });

        if (teamAgents.length > 0) {
          assignee =
            teamAgents[Math.floor(Math.random() * teamAgents.length)]._id;
        }
      }

      // Create the ticket
      const ticket = await Ticket.create({
        ticket_raised_by: req.user._id,
        assignee,
        category,
        subcategory,
        description,
        priority,
        escalation,
        attachments: attachments || [],
        status: "Open",
      });

      // Create initial conversation
      const conversation = await ticketConversation.create({
        ticket_id: ticket._id,
        sender: req.user._id,
        sender_type: "User",
        sender_role: "user",
        message: description || "",
        attachments: ticket.attachments || [],
      });

      ticket.conversations.push(conversation);
      await ticket.save();

      // Send full populated ticket
      res.status(201).json(await this._populateTicket(ticket));
    } catch (error) {
      console.error("Ticket creation failed:", error);
      this._handleError(res, error);
    }
  }

  async getTickets(req, res) {
    try {
      const { status, priority, category, page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;

      let query = {};

      // Filter based on user role
      if (req.user.role === "employee") {
        query.ticket_raised_by = req.user.id;
      } else if (req.user.role === "agent") {
        query.assignee = req.user.id;
      }

      // Apply filters
      if (status) query.status = status;
      if (priority) query.priority = priority;
      if (category) query.category = category;

      const tickets = await Ticket.find(query)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("ticket_raised_by", "name email")
        .populate("assignee", "name email")
        .populate("category")
        .populate("resolution_details.resolved_by", "name email")
        .populate("closure_details.closed_by", "name email");

      const total = await Ticket.countDocuments(query);

      res.json({
        tickets,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async getTicketById(req, res) {
    try {
      const ticket = await this._findAndVerifyTicketAccess(
        req.params.id,
        req.user
      );
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      // Populate conversations
      await ticket.populate({
        path: "conversations",
        populate: {
          path: "sender",
          select: "name email",
        },
      });

      res.json(await this._populateTicket(ticket));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async addComment(req, res) {
    try {
      const { message, attachments } = req.body;
      const ticket = await this._findAndVerifyTicketAccess(
        req.params.id,
        req.user
      );

      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      // Determine sender role
      const senderRole = ticket.assignee.equals(req.user._id)
        ? "assignee"
        : "user";

      const conversation = await TicketConversation.create({
        ticket_id: ticket._id,
        sender: req.user.id,
        sender_type: "User",
        sender_role: senderRole,
        message,
        attachments: attachments || [],
      });

      // Add conversation to ticket
      ticket.conversations.push(conversation._id);
      ticket.updated_at = Date.now();
      await ticket.save();

      res.status(201).json(await conversation.populate("sender", "name email"));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async updateStatus(req, res) {
    try {
      const { status, resolution_description, closure_reason, assurance } =
        req.body;
      const ticket = await this._findAndVerifyTicketAccess(
        req.params.id,
        req.user
      );

      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      ticket.status = status;
      ticket.updated_at = Date.now();

      // Handle resolution
      if (status === "Resolved") {
        ticket.resolution_details = {
          resolved_by: req.user.id,
          resolution_description,
          resolved_at: Date.now(),
        };
      }

      // Handle closure
      if (status === "Closed") {
        ticket.closure_details = {
          closed_by: req.user.id,
          closure_reason,
          assurance,
          closed_at: Date.now(),
        };
      }

      await ticket.save();
      res.json(await this._populateTicket(ticket));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async escalateTicket(req, res) {
    try {
      const { escalated_to, reason } = req.body;
      const ticket = await this._findAndVerifyTicketAccess(
        req.params.id,
        req.user
      );

      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      // Update escalation details
      ticket.escalation = {
        is_escalated: true,
        escalated_to,
        reason,
        escalated_at: Date.now(),
      };

      // Add escalation conversation
      const conversation = await TicketConversation.create({
        ticket_id: ticket._id,
        sender: req.user.id,
        sender_type: "User",
        sender_role: "assignee",
        message: `Ticket escalated. Reason: ${reason}`,
      });

      ticket.conversations.push(conversation._id);
      await ticket.save();

      res.json(await this._populateTicket(ticket));
    } catch (error) {
      this._handleError(res, error);
    }
  }

  async _findAndVerifyTicketAccess(ticketId, user) {
    const ticket = await Ticket.findById(ticketId);
    if (!ticket) return null;

    const hasAccess =
      user.role === "admin" ||
      ticket.ticket_raised_by.equals(user._id) ||
      ticket.assignee?.equals(user._id) ||
      ticket.escalation?.escalated_to?.equals(user._id);

    return hasAccess ? ticket : null;
  }

  async _populateTicket(ticket) {
    return await Ticket.findById(ticket._id)
      .populate("ticket_raised_by", "name email")
      .populate("assignee", "name email")
      .populate("category")
      .populate("escalation.escalationTeam", "name email")
      .populate("resolution_details.resolved_by", "name email")
      .populate("closure_details.closed_by", "name email")
      .populate({
        path: "conversations",
        populate: {
          path: "sender",
          select: "name email",
        },
      });
  }

  _handleError(res, error) {
    console.error("Ticket Error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        error: "Validation Error",
        details: error.errors,
      });
    }

    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
}

module.exports = new TicketController();
