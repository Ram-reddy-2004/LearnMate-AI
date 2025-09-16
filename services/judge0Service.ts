import { GoogleGenAI, Type } from "@google/genai";
import { Language, SubmissionResult } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const judgeResultSchema = {
    type: Type.OBJECT,
    properties: {
        status: { 
            type: Type.STRING,
            enum: ['Accepted', 'Wrong Answer', 'Runtime Error', 'Time Limit Exceeded', 'Compilation Error'],
            description: "The result of the code execution."
        },
        stdout: { 
            type: Type.STRING,
            description: "The standard output from the code. Can be an empty string.",
        },
        stderr: { 
            type: Type.STRING,
            description: "The standard error from the code, if any. Can be an empty string.",
        },
        compile_output: { 
            type: Type.STRING,
            description: "The compilation error, if any. Can be an empty string.",
        },
    },
    required: ["status"]
};


/**
 * Creates a code submission and returns the result.
 * This function uses the Gemini API to act as a code execution engine.
 */
export const createSubmission = async (language: Language, sourceCode: string, stdin?: string, expectedOutput?: string): Promise<SubmissionResult> => {
    console.log(`AI Judge executing code for ${language}`);
    
    const prompt = `
You are a meticulous and accurate code judge. Your task is to analyze and "execute" the given source code with the provided standard input (stdin) and determine the outcome by comparing its output to the expected output.

**Language:** ${language}

**Source Code:**
\`\`\`${language}
${sourceCode}
\`\`\`

**Stdin:**
\`\`\`
${stdin || '(No input)'}
\`\`\`

**Expected Output:**
\`\`\`
${expectedOutput || '(No expected output)'}
\`\`\`

Analyze the code for correctness and potential issues. Based on your analysis, respond with ONLY a JSON object matching the specified format. Do not include any extra text, explanations, or markdown formatting like \`\`\`json.

**Analysis Steps:**
1.  **Compilation Check:** Does the code have syntax errors? If so, the status is 'Compilation Error'.
2.  **Runtime Check:** If it compiles, would it throw an error when run with the given stdin? If so, the status is 'Runtime Error'. Consider edge cases like division by zero, null pointers, etc.
3.  **Infinite Loop Check:** Does the code contain logic that would lead to an infinite loop? If so, the status is 'Time Limit Exceeded'.
4.  **Output Check:** If the code runs successfully, what is its standard output (stdout)?
    -   If the \`stdout\` exactly matches the \`Expected Output\`, the status is 'Accepted'.
    -   If the \`stdout\` does not match the \`Expected Output\`, the status is 'Wrong Answer'.

**Response Format:**
Return a single JSON object with the following keys:
- \`status\`: One of 'Accepted', 'Wrong Answer', 'Runtime Error', 'Time Limit Exceeded', 'Compilation Error'.
- \`stdout\`: The captured standard output. Should be a string. Return an empty string if there's no output.
- \`stderr\`: The captured standard error. Should be a string. Return an empty string if there's no error.
- \`compile_output\`: The compilation error message. Should be a string. Return an empty string if there's no compilation error.
`;

    try {
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: judgeResultSchema,
                temperature: 0.0, // Be deterministic
                thinkingConfig: { thinkingBudget: 0 },
            },
        });
        
        const jsonString = result.text.trim();
        const parsedResult = JSON.parse(jsonString);

        // Fill in optional fields with empty strings if they are null/undefined
        const finalResult: SubmissionResult = {
            status: parsedResult.status,
            stdout: parsedResult.stdout || '',
            stderr: parsedResult.stderr || '',
            compile_output: parsedResult.compile_output || '',
            time: (Math.random() * 0.5 + 0.01).toFixed(3), // Simulate random execution time
            memory: Math.floor(Math.random() * 10000 + 8000), // Simulate random memory usage
        };
        
        // If the status is a wrong answer, Gemini might not provide the expected output. We add it back.
        if (finalResult.status === 'Wrong Answer') {
             finalResult.expectedOutput = expectedOutput;
        }

        return finalResult;

    } catch (error) {
        console.error("Error calling Gemini for code judging:", error);
        // Return a generic error that the UI can handle
        return {
            status: 'Runtime Error',
            stderr: 'The AI code judge failed to process the request. Please try again.'
        };
    }
};