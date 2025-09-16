import { GoogleGenAI, Type } from "@google/genai";
import { fileToBase64 } from "../utils/fileUtils";
import type { QuizQuestion, QuizConfig, SkillPathResponse, Concept, CodingProblem, CodingProblemDifficulty } from "../types";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface Part {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

const filesToParts = async (files: File[]): Promise<Part[]> => {
    const parts: Part[] = [];
    for (const file of files) {
        if (!file.type) {
            console.warn(`Skipping file with unknown MIME type: ${file.name}`);
            continue;
        }
        const base64Data = await fileToBase64(file);
        parts.push({
            inlineData: {
                mimeType: file.type,
                data: base64Data,
            },
        });
    }
    return parts;
}

/**
 * For chat-based interactions with files.
 */
export const generateContent = async (prompt: string, files: File[]): Promise<string> => {
  try {
    const fileParts = await filesToParts(files);
    const promptPart = { text: prompt };
    const parts = [...fileParts, promptPart];

    const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
    });

    return result.text;
  } catch (error) {
    console.error("Error generating content:", error);
    if (error instanceof Error) {
        if (error.message.includes("document has no pages")) {
            throw new Error("One of the uploaded PDF files appears to be empty or corrupted. Please check the file and try again.");
        }
        throw new Error(`Error calling Gemini API: ${error.message}`);
    }
    throw new Error("An unknown error occurred while contacting the AI.");
  }
};


/**
 * For LearnVault: Extracts text from files and links to be stored in a knowledge base.
 */
export const processLearnVaultContent = async (files: File[], links: string[]): Promise<string> => {
    if (files.length === 0 && links.length === 0) {
        return "No content provided.";
    }

    try {
        const fileParts = await filesToParts(files);
        
        let promptText = "Extract the key information and text content from the provided file(s) and web links. Focus on the main body of content, ignoring irrelevant artifacts. If a link is to a video, summarize its educational content.";
        
        if (links.length > 0) {
            promptText += `\n\nWeb Links:\n${links.join('\n')}`;
        }

        const promptPart = { text: promptText };
        const parts = [promptPart, ...fileParts];
        
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts }
        });

        console.log("Processed content from AI:", result.text.substring(0, 100) + '...');
        return result.text;

    } catch (error) {
        console.error("Error processing LearnVault content:", error);
        if (error instanceof Error) {
            if (error.message.includes("document has no pages")) {
                throw new Error("One of the uploaded PDF files appears to be empty or corrupted. Please check the file and try again.");
            }
            throw new Error(`AI processing failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during content processing.");
    }
};

/**
 * For LearnVault: Generates a knowledge base from a given topic.
 */
export const generateKnowledgeBase = async (topic: string): Promise<string> => {
    const prompt = `Generate a comprehensive knowledge base about the topic: "${topic}". 
    Include key concepts, important definitions, historical context, and significant facts. 
    The output should be well-structured text, organized with clear headings, suitable for a student to learn from.`;

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return result.text;
    } catch (error) {
        console.error("Error generating knowledge base:", error);
        if (error instanceof Error) {
            throw new Error(`AI knowledge base generation failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during knowledge base generation.");
    }
};


const quizSchema = {
    type: Type.OBJECT,
    properties: {
      topic: {
        type: Type.STRING,
        description: "A short, descriptive title for the overall topic of this quiz, derived from the source text. For example: 'JavaScript Fundamentals', 'World War II History', 'Cell Biology'."
      },
      questions: {
        type: Type.ARRAY,
        description: "An array of quiz questions.",
        items: {
          type: Type.OBJECT,
          properties: {
            questionText: {
              type: Type.STRING,
              description: "The text of the quiz question."
            },
            options: {
              type: Type.ARRAY,
              description: "An array of 4 multiple-choice options.",
              items: { type: Type.STRING }
            },
            correctAnswer: {
              type: Type.STRING,
              description: "The correct answer, which must be one of the provided options."
            },
            explanation: {
              type: Type.STRING,
              description: "A brief explanation for why the answer is correct. It must start with a short reasoning sentence, followed by a supporting quote from the learning material presented in quotation marks. The entire explanation should be concise (3-4 lines maximum). Example: 'The capital is Canberra because it was chosen as a compromise between Sydney and Melbourne. As the text states, \\\"Canberra was founded...as a compromise solution.\\\"'"
            }
          },
          required: ["questionText", "options", "correctAnswer", "explanation"]
        }
      }
    },
    required: ["topic", "questions"]
  };

/**
 * For SmartQuiz: Generates a quiz from source text using a JSON schema.
 */
export const generateQuiz = async (sourceText: string, config: QuizConfig): Promise<{ topic: string, questions: QuizQuestion[] }> => {
    const prompt = `Based on the following text, generate a multiple-choice quiz with ${config.numQuestions} questions. First, identify the main topic of the text and provide it. Then, for each question, provide four distinct options, identify the correct answer, and write a brief explanation for why that answer is correct.

    Text:
    ---
    ${sourceText}
    ---
    `;

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: quizSchema,
                thinkingConfig: { thinkingBudget: 0 },
            },
        });

        const jsonString = result.text.trim();
        const parsedResult = JSON.parse(jsonString);

        if (!parsedResult.topic || !parsedResult.questions || !Array.isArray(parsedResult.questions)) {
            throw new Error("AI response did not contain a valid 'topic' and 'questions' array.");
        }
        
        return parsedResult as { topic: string, questions: QuizQuestion[] };

    } catch (error) {
        console.error("Error generating quiz:", error);
        if (error instanceof Error) {
            throw new Error(`AI quiz generation failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during quiz generation.");
    }
}

const solutionCodeDescription = "The raw, clean, and optimal solution code. The string MUST NOT contain any HTML, CSS, or markdown formatting. It should only be the code itself, without any surrounding comments explaining the problem.";

const singleCodingProblemSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING, description: "A unique identifier for the problem, e.g., 'two-sum-easy'." },
        title: { type: Type.STRING, description: "The title of the coding problem." },
        difficulty: { type: Type.STRING, enum: ["Easy", "Medium", "Hard"] },
        description: { type: Type.STRING, description: "A detailed description of the problem." },
        constraints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A list of constraints for the input values." },
        examples: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    input: { type: Type.STRING, description: "Example input, formatted as key-value pairs. e.g., 'nums = [2, 7, 11, 15], target = 9'" },
                    output: { type: Type.STRING, description: "Expected output for the example." },
                    explanation: { type: Type.STRING, description: "Optional explanation for the example." }
                },
                required: ["input", "output"]
            }
        },
        testCases: {
            type: Type.ARRAY,
            description: "An array of 5-10 hidden test cases with varied inputs to validate the solution.",
            items: {
                type: Type.OBJECT,
                properties: {
                    input: { type: Type.STRING, description: "Test case input, formatted for programmatic use. E.g., for two inputs `[2,7,11,15]` and `9`, format as `[2,7,11,15]\\n9`." },
                    output: { type: Type.STRING, description: "Expected output for the test case." }
                },
                required: ["input", "output"]
            }
        },
        starterCode: {
            type: Type.OBJECT,
            description: "Boilerplate code for each supported language.",
            properties: {
                javascript: { type: Type.STRING, description: "Starter code for JavaScript." },
                python: { type: Type.STRING, description: "Starter code for Python." },
                java: { type: Type.STRING, description: "Starter code for Java." },
                c: { type: Type.STRING, description: "Starter code for C." },
            },
            required: ["javascript", "python", "java", "c"]
        },
        solution: {
            type: Type.OBJECT,
            description: "An optimal and correct solution for the problem for each supported language.",
            properties: {
                javascript: { type: Type.STRING, description: solutionCodeDescription },
                python: { type: Type.STRING, description: solutionCodeDescription },
                java: { type: Type.STRING, description: solutionCodeDescription },
                c: { type: Type.STRING, description: solutionCodeDescription },
            },
            required: ["javascript", "python", "java", "c"]
        }
    },
    required: ["id", "title", "difficulty", "description", "constraints", "examples", "testCases", "starterCode", "solution"]
};

/**
 * For TestBuddy: Generates a single coding problem based on source text and difficulty.
 */
export const generateCodingProblem = async (sourceText: string, difficulty: CodingProblemDifficulty): Promise<CodingProblem> => {
    const prompt = `Based on the following knowledge base about programming concepts, generate ONE new coding problem of '${difficulty}' difficulty.
The problem must be a complete LeetCode-style definition.
- The 'input' for test cases must be formatted with newlines separating arguments for easy parsing.
- For the 'solution' field, provide only the raw, clean, and optimal code for each language. The code string MUST NOT contain any HTML, CSS, or markdown formatting. It should not have header comments (like Javadoc) that explain the problem; it should only be the implementation.

    Knowledge Base:
    ---
    ${sourceText}
    ---
    `;

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: singleCodingProblemSchema,
                thinkingConfig: { thinkingBudget: 0 },
            },
        });

        const jsonString = result.text.trim();
        const parsedResult = JSON.parse(jsonString);
        
        // Basic validation
        if (!parsedResult.id || !parsedResult.title || !parsedResult.testCases || !parsedResult.solution) {
            throw new Error("AI response did not contain a valid coding problem structure.");
        }
        
        return parsedResult as CodingProblem;

    } catch (error) {
        console.error("Error generating coding problem:", error);
        if (error instanceof Error) {
            throw new Error(`AI problem generation failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during problem generation.");
    }
};

/**
 * For TestBuddy: Provides a hint for incorrect code.
 */
export const generateCodeHint = async (problem: CodingProblem, userCode: string, failedTest: { input: string, expected: string, actual: string }): Promise<string> => {
    const prompt = `You are an expert, encouraging coding tutor. A student's code has failed a test case. Your goal is to provide a short, actionable hint to guide them to the correct solution without giving away the answer.

    Problem Description:
    ---
    ${problem.description}
    ---

    Student's Code:
    ---
    ${userCode}
    ---

    Failed Test Case:
    - Input: ${failedTest.input}
    - Expected Output: ${failedTest.expected}
    - Actual Output: ${failedTest.actual}

    Please provide a helpful hint. Focus on the logic error. For example, if they missed an edge case, gently point them toward it. If their algorithm is incorrect, suggest they rethink their approach for a specific part of the problem. Keep the hint to 1-3 sentences.`;

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return result.text;
    } catch (error) {
        console.error("Error generating code hint:", error);
        return "Sorry, I couldn't generate a hint right now. Please try again.";
    }
};

/**
 * For TestBuddy: Explains why a user's code failed a specific test case.
 */
export const generateFailureExplanation = async (problem: CodingProblem, userCode: string, failedTest: { input: string; expected: string; actual: string; }): Promise<string> => {
    const prompt = `You are an expert debugging assistant. A student's code failed a test case. Your task is to explain exactly why the code produced the wrong output for the given input.

    **Problem:** ${problem.title}
    *Description:* ${problem.description}

    **Student's Code:**
    \`\`\`
    ${userCode}
    \`\`\`

    **Failed Test Case:**
    - **Input:** \`${failedTest.input}\`
    - **Expected Output:** \`${failedTest.expected}\`
    - **Actual Output from Code:** \`${failedTest.actual}\`

    **Instructions:**
    1.  Analyze the student's code logic.
    2.  Trace the execution with the specific **Input**.
    3.  Pinpoint the logical flaw that causes the **Actual Output** to differ from the **Expected Output**.
    4.  Provide a concise, 2-3 sentence explanation. Start by directly stating the issue. For example: "Your code fails on this test case because it doesn't handle negative numbers correctly..." or "The logic incorrectly resets the counter inside the loop...". Do not be generic; be specific to the code and the failed test case.`;

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return result.text;
    } catch (error) {
        console.error("Error generating failure explanation:", error);
        return "Sorry, an error occurred while analyzing the failure. Please check your logic and try again.";
    }
};


/**
 * For TestBuddy: Determines if a knowledge base is programming-related.
 */
export const isProgrammingTopic = async (sourceText: string): Promise<boolean> => {
    const prompt = `Analyze the following text and determine if its primary subject is related to computer programming, software development, algorithms, or data structures. Respond with only a JSON object containing a single boolean key "isProgrammingTopic".

    Text:
    ---
    ${sourceText.substring(0, 4000)}
    ---
    `;
    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        isProgrammingTopic: { type: Type.BOOLEAN }
                    },
                    required: ["isProgrammingTopic"]
                },
                thinkingConfig: { thinkingBudget: 0 },
            },
        });
        const jsonString = result.text.trim();
        const parsed = JSON.parse(jsonString);
        return parsed.isProgrammingTopic;
    } catch (error) {
        console.error("Error determining topic type:", error);
        // Default to non-programming on error to be safe
        return false;
    }
};


/**
 * For MyProgress: Generates motivational insights based on performance data.
 */
export const generateProgressInsights = async (performanceSummary: string): Promise<string> => {
    const prompt = `You are an encouraging AI learning coach. Based on the following student performance summary, provide a short, motivational, and insightful message (2-3 sentences). Highlight improvements and suggest a focus area. End with a positive emoji.

    Summary:
    ---
    ${performanceSummary}
    ---
    `;

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return result.text;
    } catch (error) {
        console.error("Error generating progress insights:", error);
        // Don't throw an error to the user, just return a fallback message.
        return "Keep up the great work! Consistent practice is key to success. ✨";
    }
};

const skillPathSchema = {
    type: Type.OBJECT,
    properties: {
        careerOverview: {
            type: Type.STRING,
            description: "A brief, encouraging overview of the student's chosen career path."
        },
        trendingTechnologies: {
            type: Type.ARRAY,
            description: "An array of 3-5 relevant trending technologies.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "The name of the technology." },
                    description: { type: Type.STRING, description: "A brief description of why it's relevant." }
                },
                required: ["name", "description"]
            }
        },
        skillGaps: {
            type: Type.ARRAY,
            description: "A list of 1-3 primary skill gaps identified.",
            items: { type: Type.STRING }
        },
        learningResources: {
            type: Type.ARRAY,
            description: "A curated list of 4-6 learning resources (courses, videos, projects).",
            items: {
                type: Type.OBJECT,
                properties: {
                    type: {
                        type: Type.STRING,
                        enum: ["Course", "Video", "Project"],
                        description: "The type of the resource."
                    },
                    title: { type: Type.STRING, description: "The title of the resource." },
                    description: { type: Type.STRING, description: "A short description of the resource." },
                    url: { type: Type.STRING, description: "A valid, direct, and publicly accessible URL to the resource. NO PLACEHOLDERS." },
                    creator: { type: Type.STRING, description: "For videos, the YouTube channel name. For courses, the platform name (e.g., Coursera)." }
                },
                required: ["type", "title", "description", "url"]
            }
        }
    },
    required: ["careerOverview", "trendingTechnologies", "skillGaps", "learningResources"]
};


/**
 * For SkillPath: Generates a personalized career and skill roadmap.
 */
export const generateSkillPath = async (interests: string, skills: string): Promise<SkillPathResponse> => {
    const prompt = `Act as an expert career advisor and technical content curator. Based on the student's interests ("${interests}") and current skills ("${skills}"), generate a personalized "SkillPath". Your recommendations MUST be real and high-quality.
- Provide a concise career overview.
- Identify 3-5 relevant trending technologies.
- Highlight the primary skill gaps.
- Recommend a mix of 4-6 learning resources. For each resource:
    - The URL MUST be a valid, direct, and publicly accessible link. Do not use placeholders or generic search links.
    - For YouTube videos, prioritize content from highly-subscribed, reputable channels (e.g., freeCodeCamp.org, Fireship, Traversy Media, The Net Ninja) known for excellent tutorials. Include the channel name in the 'creator' field.
    - For courses, find well-regarded free courses from platforms like Coursera, edX, or official documentation.
    - For projects, suggest practical, real-world project ideas that would build a strong portfolio.`;

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: skillPathSchema,
                thinkingConfig: { thinkingBudget: 0 },
            },
        });
        
        const jsonString = result.text.trim();
        const parsedResult = JSON.parse(jsonString);

        // Basic validation
        if (!parsedResult.careerOverview || !parsedResult.learningResources) {
            throw new Error("AI response is missing required fields for SkillPath.");
        }

        return parsedResult as SkillPathResponse;

    } catch (error) {
        console.error("Error generating SkillPath:", error);
        if (error instanceof Error) {
            throw new Error(`AI SkillPath generation failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during SkillPath generation.");
    }
};

const conceptSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "The title of the concept." },
        definition: { type: Type.STRING, description: "A concise, one-sentence definition of the concept. Should be clear and easy to understand." },
        explanation: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "A clear explanation of the concept, broken down into 3-5 short, easy-to-understand bullet points. If the topic is related to programming, include relevant code snippets as separate bullet points, enclosed in markdown-style triple backticks (e.g., ```js\\nconsole.log('Hello');\\n```)."
        },
        examples: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "2-3 practical examples, mini-scenarios, or analogies to illustrate the concept. If the topic is programming-related, these examples should be primarily code snippets enclosed in markdown-style triple backticks."
        }
    },
    required: ["title", "definition", "explanation", "examples"]
};

const codingTutorPreamble = `You are an expert technical writer and teacher for an e-learning platform. Your goal is to explain concepts clearly, especially coding topics. When providing code examples, you MUST adhere to these rules:
1.  Always provide code inside fenced Markdown code blocks with the correct language tag (e.g., \`\`\`js).
2.  The code inside the block must be clean, readable, and copy-paste ready.
3.  Do NOT include any HTML, CSS, or Tailwind classes inside the code block. Only provide the raw, essential code.
---
`;

/**
 * For LearnGuide: Starts a session by identifying concepts and explaining the first one.
 */
export const startLearnGuideSession = async (knowledgeBase: string): Promise<{ concepts: string[], firstConcept: Concept }> => {
    const prompt = `${codingTutorPreamble}Act as a teacher. Analyze the following knowledge base and break it down into a logical sequence of key learning concepts.
1.  Provide a JSON array containing only the titles of all the concepts in the order they should be learned.
2.  Provide a breakdown for the VERY FIRST concept in the sequence. This breakdown must include a short 'definition', a concise 'explanation' broken down into 3-5 clear bullet points, and 2-3 practical 'examples' or mini-scenarios.
3.  If the topic is programming-related (e.g., JavaScript, Python), ensure the 'explanation' and 'examples' include relevant code snippets. Each code snippet MUST be a separate item in its array, enclosed in markdown-style triple backticks. Do not include explanatory text within the same item as a code block.

Knowledge Base:
---
${knowledgeBase}
---
`;
    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        concepts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "An array of concept titles in learning order." },
                        firstConcept: conceptSchema
                    },
                    required: ["concepts", "firstConcept"]
                },
                thinkingConfig: { thinkingBudget: 0 },
            }
        });
        const jsonString = result.text.trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error starting LearnGuide session:", error);
        throw new Error("AI failed to create a learning plan from the provided content.");
    }
};

/**
 * For LearnGuide: Gets the explanation for a specific concept.
 */
export const getConceptExplanation = async (knowledgeBase: string, conceptTitle: string, learnedConcepts: string[]): Promise<Concept> => {
    const prompt = `${codingTutorPreamble}I am teaching a student based on the following text. They have already understood these concepts: [${learnedConcepts.join(', ')}].
Now, please provide a breakdown of the concept of "${conceptTitle}". This breakdown must include a short 'definition', a concise 'explanation' broken down into 3-5 clear bullet points, and 2-3 practical 'examples' or mini-scenarios.
If the topic is programming-related (e.g., JavaScript, Python), ensure the 'explanation' and 'examples' include relevant code snippets. Each code snippet MUST be a separate item in its array, enclosed in markdown-style triple backticks. Do not include explanatory text within the same item as a code block.

Full Text:
---
${knowledgeBase}
---
`;
    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { 
                responseMimeType: "application/json", 
                responseSchema: conceptSchema,
                thinkingConfig: { thinkingBudget: 0 },
            }
        });
        const jsonString = result.text.trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error getting concept explanation:", error);
        throw new Error("AI failed to explain the next concept.");
    }
};

/**
 * For LearnGuide: Re-explains a concept more simply.
 */
export const reexplainConcept = async (conceptTitle: string, originalExplanation: string[]): Promise<Concept> => {
    const prompt = `${codingTutorPreamble}A student is confused about the concept of "${conceptTitle}". Their current explanation is: "${originalExplanation.join('. ')}".
Please re-explain this concept in simpler terms. Use a clear analogy or a different, more straightforward example to help them understand. Your response must include a new simplified 'definition', a new 'explanation' broken down into simple bullet points, and new 'examples'. The goal is clarity and comprehension.
If the topic is programming-related, ensure your new examples are clear, concise code snippets. Each code snippet MUST be a separate item in its array, enclosed in markdown-style triple backticks.
`;
    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { 
                responseMimeType: "application/json", 
                responseSchema: conceptSchema,
                thinkingConfig: { thinkingBudget: 0 },
            }
        });
        const jsonString = result.text.trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error re-explaining concept:", error);
        throw new Error("AI failed to provide a simpler explanation.");
    }
};

/**
 * For LearnGuide: Explains a code snippet.
 */
export const explainCodeSnippet = async (codeSnippet: string): Promise<string> => {
    const prompt = `You are an expert programming tutor. A student needs help understanding a piece of code. Your task is to explain it clearly and concisely.

Follow these instructions precisely:
1.  **Ignore all comments** within the code. Do not mention or explain the comments.
2.  First, explain the **purpose** of the code snippet. Why would a developer use this? What problem does it solve? (The "Why").
3.  Second, explain **how the code works** step-by-step or by logical block. (The "What").
4.  Use markdown for formatting (like **bold** text or \`inline code\`) to make the explanation easy to read.

Code to explain:
\`\`\`
${codeSnippet}
\`\`\`
`;
    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return result.text;
    } catch (error) {
        console.error("Error explaining code snippet:", error);
        throw new Error("AI failed to explain the code snippet.");
    }
};