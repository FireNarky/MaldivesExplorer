import { runDueJobs } from "@/jobs/worker";

const completed = await runDueJobs();
console.log(`Finished ${completed} job${completed === 1 ? "" : "s"}.`);
