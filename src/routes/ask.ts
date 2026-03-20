import type { FastifyInstance } from "fastify";
import {callLLM} from "../services/llm.js";

export default async function askRoute(app: FastifyInstance) {
  app.post("/ask", async (request, reply) => {
    try {
      const { question } = request.body as { question: string };

      if (!question) {
        return reply.status(400).send({ error: "Question is required" });
      }

      const response = await callLLM(question);

      return { answer : response };
    } catch (err) {
      console.error(err);
      return reply.status(500).send({ error: "Something went wrong" });
    }
  });
}