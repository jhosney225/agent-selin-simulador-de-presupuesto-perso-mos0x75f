
```javascript
import Anthropic from "@anthropic-ai/sdk";
import * as readline from "readline";

const client = new Anthropic();

interface Transaction {
  category: string;
  amount: number;
  description: string;
  type: "income" | "expense";
}

interface BudgetData {
  monthlyIncome: number;
  transactions: Transaction[];
}

const budgetData: BudgetData = {
  monthlyIncome: 0,
  transactions: [],
};

const conversationHistory: Array<{ role: string; content: string }> = [];

async function chat(userMessage: string): Promise<string> {
  conversationHistory.push({
    role: "user",
    content: userMessage,
  });

  const response = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    system: `You are a helpful personal budget assistant. You help users manage their monthly budget by tracking income and expenses.
    
Current budget state:
- Monthly Income: $${budgetData.monthlyIncome}
- Total Expenses: $${budgetData.transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)}
- Total Income (Additional): $${budgetData.transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0)}
- Remaining Budget: $${budgetData.monthlyIncome + budgetData.transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0) - budgetData.transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)}

Current Transactions:
${budgetData.transactions.map((t) => `- ${t.description}: $${t.amount} (${t.category}, ${t.type})`).join("\n") || "No transactions yet"}

When the user wants to:
1. Set monthly income: Ask for the amount and confirm
2. Add an expense: Ask for category, amount, and description
3. Add income: Ask for amount and source
4. View budget: Provide a summary
5. Get insights: Provide budget analysis and recommendations

Always ask clarifying questions and provide helpful budget advice.`,
    messages: conversationHistory.map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
  });

  const assistantMessage =
    response.content[0].type === "text" ? response.content[0].text : "";
  conversationHistory.push({
    role: "assistant",
    content: assistantMessage,
  });

  // Process commands from user input
  processUserIntent(userMessage);

  return assistantMessage;
}

function processUserIntent(userMessage: string): void {
  const lowerMessage = userMessage.toLowerCase();

  // Extract income amount if user mentions setting income
  if (
    (lowerMessage.includes("income") || lowerMessage.includes("earn")) &&
    lowerMessage.includes("$")
  ) {
    const amountMatch = userMessage.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (amountMatch) {
      const amount = parseFloat(amountMatch[1].replace(/,/g, ""));
      budgetData.monthlyIncome = amount;
    }
  }

  // Extract expense if user mentions adding expense
  if (lowerMessage.includes("spend") || lowerMessage.includes("expense")) {
    const amountMatch = userMessage.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (amountMatch) {
      const amount = parseFloat(amountMatch[1].replace(/,/g, ""));

      let category = "other";
      if (lowerMessage.includes("food") || lowerMessage.includes("grocery"))
        category = "food";
      else if (
        lowerMessage.includes("transport") ||
        lowerMessage.includes("gas")
      )
        category = "transport";
      else if (lowerMessage.includes("utilities")) category = "utilities";
      else if (lowerMessage.includes("entertainment"))
        category = "entertainment";
      else if (lowerMessage.includes("health") || lowerMessage.includes("gym"))
        category = "health";

      budgetData.transactions.push({
        category,
        amount,
        description: userMessage.substring(0, 50),
        type: "expense",
      });
    }
  }

  // Extract additional income
  if (
    lowerMessage.includes("extra income") ||
    lowerMessage.includes("bonus") ||
    lowerMessage.includes("side income")
  ) {
    const amountMatch = userMessage.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (amountMatch) {
      const amount = parseFloat(amountMatch[1].replace(/,/g, ""));
      budgetData.transactions.push({
        category: "additional_income",
        amount,
        description: userMessage.substring(0, 50),
        type: "income",
      });
    }
  }
}

async function main(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("=== Personal Budget Simulator ===");
  console.log("Chat with your AI budget assistant!");
  console.log(
    "Type 'exit' to quit, 'budget' to see your budget, 'clear' to reset\n"
  );

  // Initial greeting
  const greeting = await chat(
    "Hello! I want to start managing my personal budget. Can you help me?"
  );
  console.log(`Assistant: ${greeting}\n`);

  const askQuestion = (): void => {
    rl.question("You: