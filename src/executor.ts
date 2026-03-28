import { exec } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { promisify } from 'util';
import path from 'path';
import { Language, ExecutionResult } from './types';

const execAsync = promisify(exec);

const IMAGE_MAP: Record<Language, string> = {
  javascript: 'code-runner-js',
  python: 'code-runner-py',
  java: 'code-runner-java',
  cpp: 'code-runner-cpp',
};

const FILE_EXTENSION: Record<Language, string> = {
  javascript: 'js',
  python: 'py',
  java: 'java',
  cpp: 'cpp',
};

const TIMEOUT_MS = 10000; // 10 seconds

export async function executeCode(
  submissionId: string,
  code: string,
  language: Language
): Promise<ExecutionResult> {
  const ext = FILE_EXTENSION[language];
  const image = IMAGE_MAP[language];
  const tmpFile = `/tmp/${submissionId}.${ext}`;
  const containerFile = language === 'java' ? '/app/solution.java' : `/app/solution.${ext}`;

  // Write code to temp file
  await writeFile(tmpFile, code);

  try {
    const command = [
      'docker run',
      '--rm',
      '--network none',
      '--memory 256m',
      '--cpus 0.5',
      `--name submission-${submissionId}`,
      `-v ${tmpFile}:${containerFile}`,
      image,
    ].join(' ');

    const { stdout, stderr } = await execAsync(command, {
      timeout: TIMEOUT_MS,
    });

    return { stdout, stderr, exitCode: 0, timedOut: false };

  } catch (err: any) {
    const timedOut = err.killed || err.signal === 'SIGTERM';

    // Kill container if it's still running after timeout
    if (timedOut) {
      await execAsync(`docker kill submission-${submissionId}`).catch(() => {});
    }

    return {
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? err.message,
      exitCode: err.code ?? 1,
      timedOut,
    };
  } finally {
    // Always clean up temp file
    await unlink(tmpFile).catch(() => {});
  }
}