import { consumer } from "../kafka/client.js"; 
import { EVALUATION_REQUESTS_TOPIC, ensureEvaluationTopic } from "../kafka/topics.js";
import { retrieveContext } from "../rag/query.js";
import { callLLM } from "../services/llm.js";
import { loadData } from "../rag/ingest.js";
import { redis } from "../store/redis.js";
import { recordJobProcessed, workerRegister } from "../metrics/metrics.js";
import Fastify from "fastify";

import dotenv from "dotenv"

dotenv.config();

const runWorker = async() =>{
    const metricsServer = Fastify();
    metricsServer.get("/metrics", async (_request, reply) => {
        reply.header("Content-Type", workerRegister.contentType);
        return workerRegister.metrics();
    });

    const preferredPort = Number(process.env.METRICS_PORT) || 4000;
    try {
        await metricsServer.listen({ port: preferredPort });
    } catch (err: any) {
        if (err.code === "EADDRINUSE") {
            await metricsServer.listen({ port: 0 });
        } else {
            throw err;
        }
    }
    const actualPort = (metricsServer.server.address() as any).port;
    console.log(`Worker metrics server running on port ${actualPort}`);

    await ensureEvaluationTopic();

    await loadData();

    await consumer.connect();
    await consumer.subscribe({
        topic: EVALUATION_REQUESTS_TOPIC , fromBeginning: true
    });

    console.log("Worker ready, waiting for jobs...");

    await consumer.run({
        eachMessage: async ({message}) => {
            const start = Date.now();
            const {jobId, question} = JSON.parse(message.value!.toString());

            console.log("Processing job:", jobId);

            const context = await retrieveContext(question);

            const prompt = `
            Context:
            ${context}

            Question:
            ${question}
            `;

            const answer = await callLLM(prompt);
            const duration = (Date.now() - start) / 1000;

            await recordJobProcessed(duration);

            await redis.set(
                jobId,
                JSON.stringify({
                    status: "completed",
                    result: answer,
                })
            )
        },
    });
};

runWorker();
