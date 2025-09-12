import { Language, SubmissionResult } from '../types';

// MOCK IMPLEMENTATION of a code execution service like Judge0.
// This allows the UI to be fully functional without needing real API keys.

const mockJudge0Response = (sourceCode: string, stdin?: string, expectedOutput?: string): SubmissionResult => {
    // Simulate different outcomes based on simple checks in the source code
    if (sourceCode.includes("syntax error")) {
        return { status: 'Compilation Error', compile_output: 'SyntaxError: Invalid token on line 3' };
    }
    if (sourceCode.includes("throw new Error") || sourceCode.includes("error")) {
        return { status: 'Runtime Error', stderr: 'Error: Something went wrong on line 5.' };
    }
    if (sourceCode.includes("while (true)") || sourceCode.includes("infinite loop")) {
        return { status: 'Time Limit Exceeded', time: "2.01" };
    }

    // Mock a simple "add two numbers" problem logic for demonstration
    try {
        // This is a very simplified parser for the mock.
        // It assumes inputs are numbers separated by spaces or newlines.
        const inputs = stdin?.split(/\s+/).filter(Boolean).map(Number) || [1, 2];
        
        // This simulates a correct solution for a problem that adds all input numbers.
        const correctSum = inputs.reduce((a, b) => a + b, 0);

        let actualOutput;
        // Mock simple student solutions
        if (sourceCode.includes("return a + b")) { // Correct for two numbers
             actualOutput = (inputs[0] + inputs[1]).toString();
        } else if (sourceCode.includes("reduce")) { // Correct for multiple numbers
            actualOutput = correctSum.toString();
        } else { // Mock an incorrect solution
             actualOutput = "0";
        }
        
        if (expectedOutput && actualOutput.trim() !== expectedOutput.trim()) {
            return { status: 'Wrong Answer', stdout: actualOutput, expectedOutput: expectedOutput, time: "0.05", memory: 15200 };
        }
        return { status: 'Accepted', stdout: actualOutput, time: "0.02", memory: 12000 };
    } catch (e) {
        return { status: 'Runtime Error', stderr: 'Could not parse input.' };
    }
};

/**
 * Creates a code submission and returns the result.
 * This is a MOCK function that simulates an API call to a code execution engine.
 */
export const createSubmission = async (language: Language, sourceCode: string, stdin?: string, expectedOutput?: string): Promise<SubmissionResult> => {
    console.log(`MOCKING code execution for ${language}`);
    
    // Simulate network delay for the API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return a mocked result based on the code and inputs
    return mockJudge0Response(sourceCode, stdin, expectedOutput);
};