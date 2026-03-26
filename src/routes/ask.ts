import type { FastifyInstance } from "fastify";
import { retrieveContext } from "../rag/query.js";
import { callLLM } from "../services/llm.js";

export default async function askRoute(app: FastifyInstance) {
  app.post("/ask", async (request, reply) => {
    try {
      const { question } = request.body as { question: string };

      const context = await retrieveContext(question);

      const finalPrompt = `
Context:
${context}

Question:
${question}
`;

      const response = await callLLM(finalPrompt);

      return { answer: response, context };
    } catch (err) {
      return reply.status(500).send({ error: "Error" });
    }
  });
}

