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

// Types for MyProgress feature
export interface QuizResult {
  score: number;
  totalQuestions: number;
  topic: string; // e.g., 'Algebra', 'History' - simulated for now
  timestamp: string;
}

// Types for TestBuddy feature
export interface TestConfig {
  numQuestions: number;
  timeLimit: number; // in minutes
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
    explanation: string;
    examples: string[];
}