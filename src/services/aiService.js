const { CohereClient } = require("cohere-ai");

// Initialize the client with your API key
const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY, // Make sure this is defined in your environment
});

async function chooseBestTeamAI(category, subcategory, description, teams) {
  const systemPrompt = `You are an intelligent ticket routing assistant. Based on the ticket's category, subcategory, and description, suggest the most suitable team from the provided list. Only return the team ID.`;

  const teamList = teams
    .map(
      (team, index) =>
        `Team ${index + 1}:\nID: ${team._id}\nName: ${
          team.name
        }\nDescription: ${team.description}`
    )
    .join("\n\n");

  const userPrompt = `
Ticket Info:
Category: ${category}
Subcategory: ${subcategory}
Description: ${description}

Teams:
${teamList}

Return only the ID of the most suitable team.
`;

  const response = await cohere.chat({
    model: "command-r", // You can also try "command-r+" or other available models
    message: userPrompt,
    temperature: 0.2,
    chatHistory: [
      {
        role: "SYSTEM",
        message: systemPrompt,
      },
    ],
  });

  return response.text.trim();
}

module.exports = { chooseBestTeamAI };
