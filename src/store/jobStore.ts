// Temporary for now , In memory 

type Job = {
    status: "pending" | "completed";
    result?: string ;
}

export const jobStore: Record<string, Job> = {};