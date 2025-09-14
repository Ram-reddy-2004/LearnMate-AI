// Fix: Import firebase v8 User type.
// Fix: Use firebase compat imports for v8 syntax. This provides the firebase.User type.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';

export type FirebaseUser = firebase.User;

export enum Sender {
  User = 'user',
  AI = 'ai',
}

export interface UploadedFile {
    name: string;
    type: string;
}

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  files?: UploadedFile[];
  isError?: boolean;
  timestamp: string;
}

// Types for SmartQuiz feature
export interface QuizQuestion {
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface QuizConfig {
  numQuestions: number;
}

// Types for MyProgress feature / MCQ Results
export interface McqResult {
  score: number;
  total: number;
  topic: string;
  completedAt: string;
}


// Types for TestBuddy feature
export type CodingProblemDifficulty = 'Easy' | 'Medium' | 'Hard';
export type Language = 'javascript' | 'python' | 'java' | 'c';

export interface Example {
    input: string;
    output: string;
    explanation?: string;
}

export interface TestCase {
    input: string;
    output: string;
}

export interface CodingProblem {
    id: string;
    title: string;
    difficulty: CodingProblemDifficulty;
    description: string;
    constraints: string[];
    examples: Example[];
    testCases: TestCase[]; // These are hidden from the user
    starterCode: Record<Language, string>;
}

export type SubmissionStatus = 'Accepted' | 'Wrong Answer' | 'Runtime Error' | 'Time Limit Exceeded' | 'Compilation Error' | 'Pending' | 'Running';

export interface SubmissionResult {
    status: SubmissionStatus;
    stdout?: string;
    expectedOutput?: string;
    stderr?: string;
    compile_output?: string;
    time?: string; // e.g., "0.05s"
    memory?: number; // in KB
    failedInput?: string;
}

export interface TestCaseResult {
    input: string;
    expectedOutput: string;
    userOutput: string;
    status: 'Passed' | 'Failed';
    error?: string;
}

// Minimal result object for storing in Firestore subcollection
export interface TestCaseResultForFirestore {
    input: string;
    expected: string;
    actual: string;
    passed: boolean;
}

export interface TestResultForFirestore {
    language: Language;
    testCases: TestCaseResultForFirestore[];
    submittedAt: any; // Will be a Firestore ServerTimestamp
}


// Types for SkillPath feature
export enum ResourceType {
  Course = 'Course',
  Video = 'Video',
  Project = 'Project',
}

export interface LearningResource {
  type: ResourceType;
  title: string;
  description: string;
  url: string;
  creator?: string; // e.g., "freeCodeCamp.org" or "Coursera"
}

export interface SkillPathResponse {
  careerOverview: string;
  trendingTechnologies: { name: string; description: string }[];
  skillGaps: string[];
  learningResources: LearningResource[];
}

// Types for LearnGuide feature
export interface Concept {
    title: string;
    definition: string;
    explanation: string[];
    examples: string[];
}

// Types for Firebase User Data
export interface UserProgress {
  accuracy: number;
  weakTopics: string[];
  lastQuizScore: number;
  timeSpent: number;
  solvedProblems: number;
}

export interface UserData {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string; // ISO String Date
  lastActive: string; // ISO String Date
  progress: UserProgress;
  learnVaultContent: string;
  mcqHistory: McqResult[];
}