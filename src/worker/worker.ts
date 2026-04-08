import { consumer } from "../kafka/client.js"; 
import { EVALUATION_REQUESTS_TOPIC, ensureEvaluationTopic } from "../kafka/topics.js";
//import { setJob } from "../store/jobStore.js";
import { retrieveContext } from "../rag/query.js";
import { callLLM } from "../services/llm.js";
import { loadData } from "../rag/ingest.js";
import { redis } from "../store/redis.js";
import { jobProcessedCounter, jobProcessingTime } from "../metrics/metrics.js";

import dotenv from "dotenv"

dotenv.config();

const runWorker = async() =>{
    await ensureEvaluationTopic();

    await loadData();

    await consumer.connect();
    await consumer.subscribe({
        topic: EVALUATION_REQUESTS_TOPIC , fromBeginning: true
    });

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

            jobProcessedCounter.inc();
            jobProcessingTime.observe(duration);

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
