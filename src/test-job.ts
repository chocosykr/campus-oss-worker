import { Queue } from 'bullmq';
import 'dotenv/config';

const queue = new Queue('code-execution', {
    connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379')
    }
});

async function addTestJob() {
    // Replace with a real submission ID from your DB
    const submissionId = "cmnbw4qb30003mqqnk9wpblvp"; 
    await queue.add('test-submission', { submissionId });
    console.log("Job added to queue!");
    process.exit(0);
}

addTestJob();