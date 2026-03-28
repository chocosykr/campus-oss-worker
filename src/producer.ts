import { Queue } from 'bullmq';
import { JobPayload } from './types';

const connection = {
    host: 'localhost',
    port: 6379,
};

const queue = new Queue<JobPayload>('code-execution', { connection });

async function main() {
    const job = await queue.add('run-code', {
        submissionId: 'cmn1njykf0011mqjlypdwx94f',
        code: `print("Hello World")a = 10`,
        language: 'javascript',
    });

    console.log(`[producer] Job added: ${job.id}`);
    await queue.close();
}

main();