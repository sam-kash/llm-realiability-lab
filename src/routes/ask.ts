import type { FastifyInstance } from "fastify";
import { retrieveContext } from "../rag/query.js";
import { callLLM } from "../services/llm.js";
import {v4 as uuid4} from "uuid"
import {producer} from "../kafka/client.js";
import { EVALUATION_REQUESTS_TOPIC } from "../kafka/topics.js";
import { getJob, setJob } from "../store/jobStore.js";


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

  app.post("/evaluate", async (request, reply) =>{
    const {question} = request.body as {question: string};
    const jobId = uuid4();
    setJob(jobId, {status : "pending"});

    await producer.send({
      topic : EVALUATION_REQUESTS_TOPIC,
      messages: [{
        value: JSON.stringify({
          jobId, question
        }),
      }]
    })
    return {jobId};
  }),

  app.get("/result/:id", (request, reply) => {
    const {id} = request.params as {id: string};
    const job = getJob(id);

    if(!job){
      return reply.status(404).send({
        error: "Job not found"
      });
    }

    return job;
  })
}
