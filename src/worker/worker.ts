import { consumer } from "../kafka/client.js"; 
import { EVALUATION_REQUESTS_TOPIC, ensureEvaluationTopic } from "../kafka/topics.js";
import { setJob } from "../store/jobStore.js";
import { retrieveContext } from "../rag/query.js";
import { callLLM } from "../services/llm.js";

const runWorker = async() =>{
    await ensureEvaluationTopic();
    await consumer.connect();
    await consumer.subscribe({
        topic: EVALUATION_REQUESTS_TOPIC , fromBeginning: true
    });

    await consumer.run({
        eachMessage: async ({message}) => {
            const {jobId, question} = JSON.parse(message.value!.toString());

            console.log("Processing job:", jobId);

            const context = await retrieveContext(question);

            const prompt = `
            Context:
            ${context}

            Question:
            ${question}
            `;

            const answer = await callLLM(prompt)

            setJob(jobId, {
                status : "completed",
                result : answer,
            });
        },
    });
};

runWorker();
