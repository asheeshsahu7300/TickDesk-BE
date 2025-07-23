const mongoose = require("mongoose");
const OpenAI = require("openai");
const Schema = mongoose.Schema;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define attachment schema
const attachmentSchema = new Schema({
  file_url: { type: String },
  file_name: { type: String },
  file_type: { type: String },
  file_size: { type: Number },
  uploaded_at: { type: Date, default: Date.now },
});

// Define escalation schema
const escalationSchema = new Schema({
  isEscalated: { type: Boolean, default: false },
  escalatedAt: { type: Date },
  reason: { type: String },
  level: { type: Number, default: 0 },
  escalatedBy: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    validate: {
      validator: function (value) {
        return mongoose.Types.ObjectId.isValid(value) || value === "System";
      },
      message: (props) =>
        `${props.value} is not a valid user ID or system identifier`,
    },
  },
  escalationTeam: { type: Schema.Types.ObjectId, ref: "EscalationTeam" },
  currentEscalationLevel: { type: Number, default: 0 },
  maxEscalationLevel: { type: Number, default: 3 },
  lastEscalationAttempt: { type: Date },
  aiEscalationSuggested: { type: Boolean, default: false },
  escalationHistory: [
    {
      timestamp: { type: Date, default: Date.now },
      type: {
        type: String,
        enum: ["manual", "automatic", "ai_suggested"],
        default: "manual",
      },
      fromLevel: { type: Number },
      toLevel: { type: Number },
      reason: { type: String },
      priority: { type: String },
      performedBy: { type: Schema.Types.ObjectId, ref: "User" },
      previousAssignee: { type: Schema.Types.ObjectId, ref: "User" },
      newAssignee: { type: Schema.Types.ObjectId, ref: "User" },
      previousTeam: { type: Schema.Types.ObjectId, ref: "EscalationTeam" },
      newTeam: { type: Schema.Types.ObjectId, ref: "EscalationTeam" },
      aiConfidence: { type: Number },
    },
  ],
});

// Define ticket schema
const ticketSchema = new Schema({
  title: { type: String, required: true },
  ticket_raised_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  subcategory: { type: String },
  description: { type: String, required: true },
  attachments: [attachmentSchema],
  priority: {
    type: String,
    enum: ["Low", "Medium", "High", "Urgent"],
    required: true,
  },
  status: {
    type: String,
    enum: ["Open", "In Progress", "Resolved", "Closed"],
    default: "Open",
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  conversations: [
    { type: mongoose.Schema.Types.ObjectId, ref: "TicketConversation" },
  ],
  escalation: { type: escalationSchema, default: () => ({}) },
  aiAssignment: {
    assignedBy: {
      type: String,
      enum: ["AI", "RULE_BASED", "MANUAL"],
      default: "AI",
    },
    assignedTeam: { type: Schema.Types.ObjectId, ref: "EscalationTeam" },
    assignedMember: { type: Schema.Types.ObjectId, ref: "User" },
    confidence: { type: Number, min: 0, max: 1 },
    reasoning: { type: String },
    keywords: [{ type: String }],
    timestamp: { type: Date, default: Date.now },
    fallback: { type: Boolean, default: false },
    escalationLevelSuggested: { type: Number, default: 0 },
    needsImmediateEscalation: { type: Boolean, default: false },
  },
  resolution_details: {
    resolved_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    resolution_description: { type: String },
    resolved_at: { type: Date },
  },
  closure_details: {
    closed_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    closure_reason: { type: String },
    assurance: { type: Boolean, default: false },
    closed_at: { type: Date },
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

// Import EscalationTeam model (adjust path as needed)
const EscalationTeam = require("./escalationTeam");

// AI Assignment Configuration
let AI_ASSIGNMENT_CONFIG = {
  teams: [],
  fallback: {
    defaultTeamId: null,
    escalationThreshold: 0.3,
    maxAutoEscalationLevel: 2,
  },
};

// Initialize AI configuration
async function initializeAIConfig() {
  try {
    const escalationTeams = await EscalationTeam.find({})
      .populate("members", "name email")
      .populate("escalation_levels.team_id");

    AI_ASSIGNMENT_CONFIG.teams = escalationTeams.map((team) => ({
      id: team._id.toString(),
      name: team.name,
      description: team.description,
      members: team.members,
      escalationLevels: team.escalation_levels.map((level) => ({
        level: level.level,
        description: level.description,
        teamId: level.team_id,
      })),
      expertise: extractExpertiseFromDescription(team.description),
      skills: [],
    }));

    if (AI_ASSIGNMENT_CONFIG.teams.length > 0) {
      AI_ASSIGNMENT_CONFIG.fallback.defaultTeamId =
        AI_ASSIGNMENT_CONFIG.teams[0].id;
    }

    console.log(
      "AI Configuration initialized with",
      AI_ASSIGNMENT_CONFIG.teams.length,
      "teams"
    );
    return true;
  } catch (error) {
    console.error("Failed to initialize AI config:", error);
    return false;
  }
}

// Extract expertise keywords
function extractExpertiseFromDescription(description) {
  if (!description) return [];
  const expertiseKeywords = [
    "technical",
    "support",
    "billing",
    "security",
    "sales",
    "customer service",
    "troubleshooting",
    "debugging",
    "account",
    "payment",
    "refund",
    "bug",
    "error",
    "system",
    "network",
    "database",
    "api",
    "authentication",
    "performance",
    "integration",
    "data",
    "privacy",
    "compliance",
  ];
  const desc = description.toLowerCase();
  return expertiseKeywords.filter((keyword) => desc.includes(keyword));
}

// AI-powered assignment function
async function getAIAssignment(
  title,
  description,
  category = null,
  currentEscalationLevel = 0
) {
  try {
    if (AI_ASSIGNMENT_CONFIG.teams.length === 0) {
      await initializeAIConfig();
    }

    const teams = AI_ASSIGNMENT_CONFIG.teams;
    const teamDescriptions = teams
      .map((team) => {
        const expertiseStr =
          team.expertise.length > 0
            ? team.expertise.join(", ")
            : "General support";
        const escalationInfo =
          team.escalationLevels.length > 0
            ? `\n  Escalation Levels: ${team.escalationLevels
                .map((l) => `Level ${l.level}: ${l.description}`)
                .join(", ")}`
            : "";
        return `${team.name} (ID: ${team.id}): ${
          team.description || "No description"
        }\n  Expertise: ${expertiseStr}${escalationInfo}`;
      })
      .join("\n\n");

    const prompt = `
You are an intelligent ticket routing system with escalation support. Based on the ticket information below, determine which team should handle this ticket.

Available Escalation Teams:
${teamDescriptions}

Ticket Information:
Title: "${title}"
Description: "${description}"
${category ? `Category: ${category}` : ""}
Current Escalation Level: ${currentEscalationLevel}

Instructions:
1. Analyze the ticket content to understand the issue type and complexity
2. Match it with the most appropriate team based on their expertise and escalation levels
3. Consider urgency indicators (words like "urgent", "critical", "down", "broken")
4. If this is an escalated ticket (level > 0), prefer teams with higher escalation capabilities
5. Provide a confidence score (0-1) for your assignment
6. Suggest if this ticket needs immediate escalation based on content severity

Respond in JSON format:
{
    "assignedTeamId": "team_id_here",
    "assignedTeamName": "team_name_here",
    "confidence": 0.85,
    "reasoning": "Brief explanation of why this team was chosen",
    "suggestedPriority": "Low|Medium|High|Urgent",
    "suggestedEscalationLevel": 0,
    "needsImmediateEscalation": false,
    "keywords": ["key", "words", "that", "influenced", "decision"]
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 400,
    });

    const result = JSON.parse(response.choices[0].message.content);

    const assignedTeam = teams.find(
      (team) => team.id === result.assignedTeamId
    );
    if (!assignedTeam) {
      throw new Error("Invalid team assignment from AI");
    }

    const selectedMember = selectTeamMember(
      assignedTeam,
      currentEscalationLevel
    );

    return {
      ...result,
      assignedMemberId: selectedMember?.id,
      assignedMemberName: selectedMember?.name,
      escalationTeam: assignedTeam,
      success: true,
    };
  } catch (error) {
    console.error("AI Assignment Error:", error);
    return getFallbackAssignment(title, description, currentEscalationLevel);
  }
}

// Select team member
function selectTeamMember(team, escalationLevel = 0) {
  if (!team.members || team.members.length === 0) {
    return null;
  }
  const randomIndex = Math.floor(Math.random() * team.members.length);
  return {
    id: team.members[randomIndex]._id,
    name: team.members[randomIndex].name,
    email: team.members[randomIndex].email,
  };
}

// Fallback assignment
function getFallbackAssignment(title, description, currentEscalationLevel = 0) {
  const content = `${title} ${description}`.toLowerCase();
  const teams = AI_ASSIGNMENT_CONFIG.teams;

  for (const team of teams) {
    for (const expertise of team.expertise) {
      if (content.includes(expertise.toLowerCase())) {
        const selectedMember = selectTeamMember(team, currentEscalationLevel);
        return {
          assignedTeamId: team.id,
          assignedTeamName: team.name,
          assignedMemberId: selectedMember?.id,
          assignedMemberName: selectedMember?.name,
          confidence: 0.6,
          reasoning: `Keyword match: ${expertise}`,
          suggestedPriority: "Medium",
          suggestedEscalationLevel: currentEscalationLevel,
          needsImmediateEscalation: false,
          keywords: [expertise],
          escalationTeam: team,
          success: true,
          fallback: true,
        };
      }
    }
  }

  const defaultTeam =
    teams.find(
      (team) => team.id === AI_ASSIGNMENT_CONFIG.fallback.defaultTeamId
    ) || teams[0];
  const selectedMember = selectTeamMember(defaultTeam, currentEscalationLevel);

  return {
    assignedTeamId: defaultTeam?.id || null,
    assignedTeamName: defaultTeam?.name || "Unassigned",
    assignedMemberId: selectedMember?.id,
    assignedMemberName: selectedMember?.name,
    confidence: 0.3,
    reasoning: "Default assignment - no clear match found",
    suggestedPriority: "Medium",
    suggestedEscalationLevel: currentEscalationLevel,
    needsImmediateEscalation: false,
    keywords: [],
    escalationTeam: defaultTeam,
    success: true,
    fallback: true,
  };
}

// Method to reassign ticket using AI
ticketSchema.methods.reassignWithAI = async function () {
  try {
    const currentLevel = this.escalation?.currentEscalationLevel || 0;
    const aiResult = await getAIAssignment(
      this.title,
      this.description,
      this.category,
      currentLevel
    );

    if (aiResult.success) {
      const oldAssignee = this.assignee;
      const oldTeam = this.escalation?.escalationTeam;

      this.assignee = aiResult.assignedMemberId
        ? new mongoose.Types.ObjectId(aiResult.assignedMemberId)
        : new mongoose.Types.ObjectId(aiResult.assignedTeamId);

      if (aiResult.escalationTeam) {
        this.escalation.escalationTeam = new mongoose.Types.ObjectId(
          aiResult.assignedTeamId
        );
      }

      this.aiAssignment = {
        assignedBy: aiResult.fallback ? "RULE_BASED" : "AI",
        assignedTeam: aiResult.assignedTeamId
          ? new mongoose.Types.ObjectId(aiResult.assignedTeamId)
          : null,
        assignedMember: aiResult.assignedMemberId
          ? new mongoose.Types.ObjectId(aiResult.assignedMemberId)
          : null,
        confidence: aiResult.confidence,
        reasoning: aiResult.reasoning,
        keywords: aiResult.keywords,
        timestamp: new Date(),
        fallback: aiResult.fallback || false,
        escalationLevelSuggested:
          aiResult.suggestedEscalationLevel || currentLevel,
        needsImmediateEscalation: aiResult.needsImmediateEscalation || false,
      };

      this.escalation.escalationHistory.push({
        timestamp: new Date(),
        type: "automatic",
        fromLevel: currentLevel,
        toLevel: aiResult.suggestedEscalationLevel || currentLevel,
        reason: "AI reassignment",
        performedBy: null,
        previousAssignee: oldAssignee,
        newAssignee: this.assignee,
        previousTeam: oldTeam,
        newTeam: this.escalation.escalationTeam,
        aiConfidence: aiResult.confidence,
      });

      return await this.save();
    }

    throw new Error("AI reassignment failed");
  } catch (error) {
    console.error("Reassignment error:", error);
    throw error;
  }
};

// Method to escalate ticket with AI assistance
ticketSchema.methods.escalateWithAI = async function (reason, escalatedBy) {
  try {
    const currentLevel = this.escalation?.currentEscalationLevel || 0;
    const nextLevel = currentLevel + 1;

    if (nextLevel > (this.escalation?.maxEscalationLevel || 3)) {
      throw new Error("Maximum escalation level reached");
    }

    const aiResult = await getAIAssignment(
      this.title,
      this.description,
      this.category,
      nextLevel
    );

    if (aiResult.success) {
      const oldAssignee = this.assignee;
      const oldTeam = this.escalation?.escalationTeam;
      const oldLevel = currentLevel;

      this.escalation.isEscalated = true;
      this.escalation.currentEscalationLevel = nextLevel;
      this.escalation.level = nextLevel;
      this.escalation.escalatedAt = new Date();
      this.escalation.escalatedBy = escalatedBy;
      this.escalation.reason = reason;
      this.escalation.lastEscalationAttempt = new Date();

      this.assignee = aiResult.assignedMemberId
        ? new mongoose.Types.ObjectId(aiResult.assignedMemberId)
        : new mongoose.Types.ObjectId(aiResult.assignedTeamId);

      if (aiResult.escalationTeam) {
        this.escalation.escalationTeam = new mongoose.Types.ObjectId(
          aiResult.assignedTeamId
        );
      }

      this.aiAssignment = {
        assignedBy: aiResult.fallback ? "RULE_BASED" : "AI",
        assignedTeam: aiResult.assignedTeamId
          ? new mongoose.Types.ObjectId(aiResult.assignedTeamId)
          : null,
        assignedMember: aiResult.assignedMemberId
          ? new mongoose.Types.ObjectId(aiResult.assignedMemberId)
          : null,
        confidence: aiResult.confidence,
        reasoning: `Escalation: ${aiResult.reasoning}`,
        keywords: aiResult.keywords,
        timestamp: new Date(),
        fallback: aiResult.fallback || false,
        escalationLevelSuggested: nextLevel,
        needsImmediateEscalation: false,
      };

      this.escalation.escalationHistory.push({
        timestamp: new Date(),
        type: escalatedBy === "System" ? "automatic" : "manual",
        fromLevel: oldLevel,
        toLevel: nextLevel,
        reason: reason,
        priority: this.priority,
        performedBy: escalatedBy !== "System" ? escalatedBy : null,
        previousAssignee: oldAssignee,
        newAssignee: this.assignee,
        previousTeam: oldTeam,
        newTeam: this.escalation.escalationTeam,
        aiConfidence: aiResult.confidence,
      });

      return await this.save();
    }

    throw new Error("AI escalation assignment failed");
  } catch (error) {
    console.error("Escalation error:", error);
    throw error;
  }
};

// Method to get escalation options
ticketSchema.methods.getEscalationOptions = async function () {
  try {
    const currentLevel = this.escalation?.currentEscalationLevel || 0;
    const escalationTeam = await EscalationTeam.findById(
      this.escalation?.escalationTeam
    )
      .populate("members", "name email")
      .populate("escalation_levels.team_id");

    if (!escalationTeam) {
      return { availableLevels: [], canEscalate: false };
    }

    const availableLevels = escalationTeam.escalation_levels
      .filter((level) => level.level > currentLevel)
      .sort((a, b) => a.level - b.level);

    return {
      currentLevel,
      maxLevel: this.escalation?.maxEscalationLevel || 3,
      availableLevels,
      canEscalate: availableLevels.length > 0,
      escalationTeam: {
        id: escalationTeam._id,
        name: escalationTeam.name,
        description: escalationTeam.description,
        members: escalationTeam.members,
      },
    };
  } catch (error) {
    console.error("Error getting escalation options:", error);
    return { availableLevels: [], canEscalate: false };
  }
};

// Pre-save hook
ticketSchema.pre("save", async function (next) {
  const ticket = this;

  if (!ticket.isNew) {
    return next();
  }

  try {
    console.log("Running AI assignment for ticket:", ticket.title);

    if (AI_ASSIGNMENT_CONFIG.teams.length === 0) {
      await initializeAIConfig();
    }

    const aiResult = await getAIAssignment(
      ticket.title,
      ticket.description,
      ticket.category,
      ticket.escalation?.currentEscalationLevel || 0
    );

    console.log("AI Assignment Result:", aiResult);

    if (aiResult.success) {
      ticket.assignee = aiResult.assignedMemberId
        ? new mongoose.Types.ObjectId(aiResult.assignedMemberId)
        : new mongoose.Types.ObjectId(aiResult.assignedTeamId);

      if (aiResult.escalationTeam) {
        ticket.escalation.escalationTeam = new mongoose.Types.ObjectId(
          aiResult.assignedTeamId
        );
      }

      if (
        aiResult.suggestedPriority &&
        (!ticket.priority || ticket.priority === "Medium")
      ) {
        ticket.priority = aiResult.suggestedPriority;
      }

      if (aiResult.needsImmediateEscalation) {
        ticket.escalation.isEscalated = true;
        ticket.escalation.currentEscalationLevel =
          aiResult.suggestedEscalationLevel || 1;
        ticket.escalation.level = aiResult.suggestedEscalationLevel || 1;
        ticket.escalation.reason =
          "AI suggested immediate escalation based on ticket content";
        ticket.escalation.escalatedBy = "System";
        ticket.escalation.escalatedAt = new Date();
        ticket.escalation.aiEscalationSuggested = true;
      }

      ticket.aiAssignment = {
        assignedBy: aiResult.fallback ? "RULE_BASED" : "AI",
        assignedTeam: aiResult.assignedTeamId
          ? new mongoose.Types.ObjectId(aiResult.assignedTeamId)
          : null,
        assignedMember: aiResult.assignedMemberId
          ? new mongoose.Types.ObjectId(aiResult.assignedMemberId)
          : null,
        confidence: aiResult.confidence,
        reasoning: aiResult.reasoning,
        keywords: aiResult.keywords,
        timestamp: new Date(),
        fallback: aiResult.fallback || false,
        escalationLevelSuggested: aiResult.suggestedEscalationLevel || 0,
        needsImmediateEscalation: aiResult.needsImmediateEscalation || false,
      };

      console.log(
        "Ticket assigned to:",
        aiResult.assignedTeamName,
        aiResult.assignedMemberName ? `(${aiResult.assignedMemberName})` : "",
        "with confidence:",
        aiResult.confidence
      );

      if (
        aiResult.confidence < AI_ASSIGNMENT_CONFIG.fallback.escalationThreshold
      ) {
        ticket.escalation.isEscalated = true;
        ticket.escalation.reason =
          "Low confidence AI assignment - requires manual review";
        ticket.escalation.escalatedBy = "System";
        ticket.escalation.escalatedAt = new Date();
        ticket.escalation.currentEscalationLevel = 1;
        ticket.escalation.level = 1;
      }
    } else {
      ticket.assignee = null;
      ticket.aiAssignment = {
        assignedBy: "MANUAL",
        confidence: 0,
        reasoning: "AI assignment failed - requires manual assignment",
        keywords: [],
        timestamp: new Date(),
        fallback: true,
        escalationLevelSuggested: 0,
        needsImmediateEscalation: false,
      };
    }
  } catch (error) {
    console.error("Error in AI assignment:", error);
    ticket.assignee = null;
    ticket.aiAssignment = {
      assignedBy: "MANUAL",
      confidence: 0,
      reasoning: `AI assignment error: ${error.message}`,
      keywords: [],
      timestamp: new Date(),
      fallback: true,
      escalationLevelSuggested: 0,
      needsImmediateEscalation: false,
    };
  }

  next();
});

// Static methods for analytics
ticketSchema.statics.getAssignmentAnalytics = async function (
  dateFrom,
  dateTo
) {
  return await this.aggregate([
    {
      $match: {
        created_at: { $gte: dateFrom, $lte: dateTo },
      },
    },
    {
      $group: {
        _id: {
          assignedBy: "$aiAssignment.assignedBy",
          escalationLevel: "$escalation.currentEscalationLevel",
        },
        count: { $sum: 1 },
        avgConfidence: { $avg: "$aiAssignment.confidence" },
        fallbackCount: { $sum: { $cond: ["$aiAssignment.fallback", 1, 0] } },
        immediateEscalations: {
          $sum: { $cond: ["$aiAssignment.needsImmediateEscalation", 1, 0] },
        },
        lowConfidenceCount: {
          $sum: {
            $cond: [{ $lt: ["$aiAssignment.confidence", 0.3] }, 1, 0],
          },
        },
      },
    },
    {
      $sort: { "_id.escalationLevel": 1, "_id.assignedBy": 1 },
    },
  ]);
};

ticketSchema.statics.getTeamPerformanceAnalytics = async function (
  dateFrom,
  dateTo
) {
  return await this.aggregate([
    {
      $match: {
        created_at: { $gte: dateFrom, $lte: dateTo },
        "aiAssignment.assignedTeam": { $exists: true },
      },
    },
    {
      $lookup: {
        from: "escalationteams",
        localField: "aiAssignment.assignedTeam",
        foreignField: "_id",
        as: "teamInfo",
      },
    },
    {
      $unwind: "$teamInfo",
    },
    {
      $group: {
        _id: "$aiAssignment.assignedTeam",
        teamName: { $first: "$teamInfo.name" },
        totalTickets: { $sum: 1 },
        avgConfidence: { $avg: "$aiAssignment.confidence" },
        resolvedTickets: {
          $sum: {
            $cond: [{ $eq: ["$status", "Resolved"] }, 1, 0],
          },
        },
        escalatedTickets: {
          $sum: {
            $cond: ["$escalation.isEscalated", 1, 0],
          },
        },
        avgEscalationLevel: { $avg: "$escalation.currentEscalationLevel" },
      },
    },
    {
      $addFields: {
        resolutionRate: {
          $multiply: [{ $divide: ["$resolvedTickets", "$totalTickets"] }, 100],
        },
        escalationRate: {
          $multiply: [{ $divide: ["$escalatedTickets", "$totalTickets"] }, 100],
        },
      },
    },
    {
      $sort: { totalTickets: -1 },
    },
  ]);
};

// Indexing for performance
ticketSchema.index({ ticket_raised_by: 1, created_at: 1 });
ticketSchema.index({ assignee: 1, status: 1 });
ticketSchema.index({ "aiAssignment.confidence": 1 });
ticketSchema.index({ created_at: 1 });

// Initialize AI configuration
(async () => {
  try {
    await initializeAIConfig();
  } catch (error) {
    console.error("Failed to initialize AI configuration on startup:", error);
  }
})();

module.exports = mongoose.model("Ticket", ticketSchema);
