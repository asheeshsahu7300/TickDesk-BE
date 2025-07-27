const { chooseBestTeamAI } = require("./aiService");
const EscalationTeam = require("../models/EscalationTeam");
const User = require("../models/User");

async function autoAssignTicket({ category, subcategory, description }) {
  const allTeams = await EscalationTeam.find({}).lean();

  if (allTeams.length === 0) return null;

  const bestTeamId = await chooseBestTeamAI(
    category,
    subcategory,
    description,
    allTeams
  );

  const team = allTeams.find((t) => t._id.toString() === bestTeamId);
  if (!team) return null;

  const members = await User.find({
    team_id: team._id,
    role: "agent",
  });
  if (members.length === 0) return null;

  const randomAssignee = members[Math.floor(Math.random() * members.length)];
  console.log(randomAssignee);
  return { assigneeId: randomAssignee._id, teamId: team._id };
}

module.exports = { autoAssignTicket };
