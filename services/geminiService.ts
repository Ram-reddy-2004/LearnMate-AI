import { GoogleGenAI, Type } from "@google/genai";
import { fileToBase64 } from "../utils/fileUtils";
import type { QuizQuestion, QuizConfig, TestConfig, SkillPathResponse, Concept } from "../types";

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
              description: "A brief explanation for why the answer is correct."
            }
          },
          required: ["questionText", "options", "correctAnswer", "explanation"]
        }
      }
    },
    required: ["questions"]
  };

/**
 * For SmartQuiz: Generates a quiz from source text using a JSON schema.
 */
export const generateQuiz = async (sourceText: string, config: QuizConfig): Promise<QuizQuestion[]> => {
    const prompt = `Based on the following text, generate a multiple-choice quiz with ${config.numQuestions} questions. For each question, provide four distinct options, identify the correct answer, and write a brief explanation for why that answer is correct.

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
            },
        });

        const jsonString = result.text.trim();
        const parsedResult = JSON.parse(jsonString);

        if (!parsedResult.questions || !Array.isArray(parsedResult.questions)) {
            throw new Error("AI response did not contain a valid 'questions' array.");
        }
        
        return parsedResult.questions as QuizQuestion[];

    } catch (error) {
        console.error("Error generating quiz:", error);
        if (error instanceof Error) {
            throw new Error(`AI quiz generation failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during quiz generation.");
    }
}


/**
 * For TestBuddy: Generates a mock test from source text using a JSON schema.
 */
export const generateMockTest = async (sourceText: string, config: TestConfig): Promise<QuizQuestion[]> => {
    const prompt = `Based on the following knowledge base, generate a mock test with ${config.numQuestions} multiple-choice questions suitable for a timed exam environment. The questions should cover a range of topics from the text and vary in difficulty. For each question, provide four distinct options, identify the correct answer, and write a brief explanation for why that answer is correct.

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
                responseSchema: quizSchema,
            },
        });

        const jsonString = result.text.trim();
        const parsedResult = JSON.parse(jsonString);

        if (!parsedResult.questions || !Array.isArray(parsedResult.questions)) {
            throw new Error("AI response did not contain a valid 'questions' array.");
        }
        
        return parsedResult.questions as QuizQuestion[];

    } catch (error) {
        console.error("Error generating mock test:", error);
        if (error instanceof Error) {
            throw new Error(`AI test generation failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during test generation.");
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
        explanation: { type: Type.STRING, description: "A detailed but clear explanation of the concept." },
        examples: { type: Type.ARRAY, items: { type: Type.STRING }, description: "2-3 practical examples or mini-scenarios." }
    },
    required: ["title", "explanation", "examples"]
};

/**
 * For LearnGuide: Starts a session by identifying concepts and explaining the first one.
 */
export const startLearnGuideSession = async (knowledgeBase: string): Promise<{ concepts: string[], firstConcept: Concept }> => {
    const prompt = `Act as a teacher. Analyze the following knowledge base and break it down into a logical sequence of key learning concepts.
1.  Provide a JSON array containing only the titles of all the concepts in the order they should be learned.
2.  Provide a detailed explanation for the VERY FIRST concept in the sequence, including 2-3 practical examples or mini-scenarios.

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
                }
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
    const prompt = `I am teaching a student based on the following text. They have already understood these concepts: [${learnedConcepts.join(', ')}].
Now, please explain the concept of "${conceptTitle}" in detail, providing 2-3 practical examples or mini-scenarios. Keep the explanation focused and clear.

Full Text:
---
${knowledgeBase}
---
`;
    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: conceptSchema }
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
export const reexplainConcept = async (conceptTitle: string, originalExplanation: string): Promise<Concept> => {
    const prompt = `A student is confused about the concept of "${conceptTitle}". Their current explanation is: "${originalExplanation}".
Please re-explain this concept in simpler terms. Use a clear analogy or a different, more straightforward example to help them understand. The goal is clarity and comprehension.
`;
    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { responseMimeType: "application/json", responseSchema: conceptSchema }
        });
        const jsonString = result.text.trim();
        return JSON.parse(jsonString);
    } catch (error) {
        console.error("Error re-explaining concept:", error);
        throw new Error("AI failed to provide a simpler explanation.");
    }
};