export type Language = 'javascript' | 'python' | 'java' | 'cpp';

export interface JobPayload {
  submissionId: string;
  code: string;
  language: Language;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}