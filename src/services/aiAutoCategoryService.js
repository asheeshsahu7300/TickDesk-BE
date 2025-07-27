const { CohereClient } = require("cohere-ai");

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

/**
 * Extracts the best-matching category and subcategory using AI.
 * @param {string} description - Ticket description
 * @param {Array} categories - Array of category objects with subcategories
 * @returns {Promise<{ categoryId: string, subcategoryId: string } | null>}
 */
async function suggestCategoryAI(description, categories) {
  const systemPrompt = `You are a smart IT support assistant that classifies tickets into categories and subcategories. Your task is to return only the category ID and subcategory ID that best match the issue description.`;

  const categoryListText = categories
    .map(
      (cat, i) => `Category ${i + 1}:
ID: ${cat._id}
Name: ${cat.name}
Description: ${cat.description}
Subcategories:
${cat.subcategories
  .map((sub, j) => `  - ${sub.name} (ID: ${sub._id}) — ${sub.description}`)
  .join("\n")}`
    )
    .join("\n\n");

  const userPrompt = `
Ticket Description:
"${description}"

Available Categories:
${categoryListText}

Respond ONLY JSON structure
{
  "categoryId": "<category_id>",
  "subcategoryId": "<subcategory_id>"
}
`;

  const response = await cohere.chat({
    model: "command-r",
    message: userPrompt,
    temperature: 0.2,
    chatHistory: [
      {
        role: "SYSTEM",
        message: systemPrompt,
      },
    ],
  });

  try {
    // Remove Markdown-style code block if present
    const cleaned = response.text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    return parsed;
  } catch (err) {
    console.error("Failed to parse AI response:", response.text);
    return null;
  }
}

module.exports = { suggestCategoryAI };
