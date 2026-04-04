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

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  hidden: boolean;
}

export interface TestCaseResult {
  testCaseId: string;
  passed: boolean;
  actualOutput: string;
  expectedOutput: string; // Only return this for non-hidden tests in frontend
  error?: string;
  hidden: boolean;
}

export interface GradeResult {
  total: number;
  passed: number;
  failed: number;
  details: TestCaseResult[];
}