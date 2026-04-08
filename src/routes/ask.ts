import type { FastifyInstance } from "fastify";
import { retrieveContext } from "../rag/query.js";
import { callLLM } from "../services/llm.js";
import {v4 as uuid4} from "uuid"
import {producer} from "../kafka/client.js";
import { EVALUATION_REQUESTS_TOPIC } from "../kafka/topics.js";
//import { getJob, setJob } from "../store/jobStore.js";
import { redis } from "../store/redis.js";
import { requestCounter } from "../metrics/metrics.js";


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
    requestCounter.inc();
    const {question} = request.body as {question: string};
    const jobId = uuid4();
    await redis.set(
      jobId,
      JSON.stringify({status: "pending"})
    )

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

  app.get("/result/:id", async (request, reply) => {
    const {id} = request.params as {id: string};
    //const job = getJob(id);
    const job = await redis.get(id);

    if(!job){
      return reply.status(404).send({
        error: "Job not found"
      });
    }

    return JSON.parse(job);
  })
}
