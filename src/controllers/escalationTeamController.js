const EscalationTeam = require("../models/escalationTeam");

class EscalationTeamController {
  // Create a new escalation team
  async createTeam(req, res) {
    try {
      const { name, description, members, escalation_levels } = req.body;

      const team = await EscalationTeam.create({
        name,
        description,
        members,
        escalation_levels,
      });

      return res.status(201).json({
        success: true,
        message: "Escalation team created successfully",
        data: team,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error creating escalation team",
        error: error.message,
      });
    }
  }

  // Get all escalation teams
  async getAllTeams(req, res) {
    try {
      const teams = await EscalationTeam.find()
        .populate("members", "name email")
        .sort({ created_at: -1 });

      return res.status(200).json({
        success: true,
        count: teams.length,
        data: teams,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error fetching escalation teams",
        error: error.message,
      });
    }
  }
  // Get all teams with only ID and name
  async getTeamNamesWithIds(req, res) {
    try {
      const teams = await EscalationTeam.find({}, "_id name");

      return res.status(200).json(teams);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error fetching teams",
        error: error.message,
      });
    }
  }

  // Get team by ID
  async getTeamById(req, res) {
    try {
      const team = await EscalationTeam.findById(req.params.id).populate(
        "members",
        "name email"
      );

      if (!team) {
        return res.status(404).json({
          success: false,
          message: "Escalation team not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: team,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error fetching escalation team",
        error: error.message,
      });
    }
  }

  // Update team
  async updateTeam(req, res) {
    try {
      const { name, description, members, escalation_levels } = req.body;

      const team = await EscalationTeam.findByIdAndUpdate(
        req.params.id,
        {
          name,
          description,
          members,
          escalation_levels,
          updated_at: Date.now(),
        },
        { new: true, runValidators: true }
      ).populate("members", "name email");

      if (!team) {
        return res.status(404).json({
          success: false,
          message: "Escalation team not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Escalation team updated successfully",
        data: team,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error updating escalation team",
        error: error.message,
      });
    }
  }

  // Delete team
  async deleteTeam(req, res) {
    try {
      const team = await EscalationTeam.findById(req.params.id);

      if (!team) {
        return res.status(404).json({
          success: false,
          message: "Escalation team not found",
        });
      }

      await team.remove();

      return res.status(200).json({
        success: true,
        message: "Escalation team deleted successfully",
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error deleting escalation team",
        error: error.message,
      });
    }
  }

  // Add member to team
  async addTeamMember(req, res) {
    try {
      const { teamId, userId } = req.body;

      const team = await EscalationTeam.findById(teamId);
      if (!team) {
        return res.status(404).json({
          success: false,
          message: "Escalation team not found",
        });
      }

      if (team.members.includes(userId)) {
        return res.status(400).json({
          success: false,
          message: "User is already a team member",
        });
      }

      team.members.push(userId);
      await team.save();

      const updatedTeam = await EscalationTeam.findById(teamId).populate(
        "members",
        "name email"
      );

      return res.status(200).json({
        success: true,
        message: "Team member added successfully",
        data: updatedTeam,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error adding team member",
        error: error.message,
      });
    }
  }

  // Remove member from team
  async removeTeamMember(req, res) {
    try {
      const { teamId, userId } = req.body;

      const team = await EscalationTeam.findById(teamId);
      if (!team) {
        return res.status(404).json({
          success: false,
          message: "Escalation team not found",
        });
      }

      if (!team.members.includes(userId)) {
        return res.status(400).json({
          success: false,
          message: "User is not a team member",
        });
      }

      team.members = team.members.filter(
        (member) => member.toString() !== userId
      );
      await team.save();

      const updatedTeam = await EscalationTeam.findById(teamId).populate(
        "members",
        "name email"
      );

      return res.status(200).json({
        success: true,
        message: "Team member removed successfully",
        data: updatedTeam,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error removing team member",
        error: error.message,
      });
    }
  }
}

module.exports = new EscalationTeamController();
