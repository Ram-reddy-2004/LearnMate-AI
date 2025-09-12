import React, { useState, useEffect, useCallback } from 'react';
import { isProgrammingTopic, generateQuiz, generateCodingProblems, generateCodeHint } from '../services/geminiService';
import { createSubmission } from '../services/judge0Service';
// Fix: Import the SubmissionStatus type.
import { type CodingProblem, type CodingProblemDifficulty, type Language, type SubmissionResult, type QuizQuestion, type CodingAttempt, type TestCaseResult, type SubmissionStatus } from '../types';
import { BrainCircuitIcon, FlaskConicalIcon, CheckCircleIcon, XCircleIcon, ClockIcon, PlayIcon, SendHorizonalIcon, ArrowRightIcon, CodeIcon, PencilRulerIcon, LightbulbIcon, SparklesIcon, CheckIcon } from './Icons';
import CodeEditor from './CodeEditor';
import Timer from './Timer';

type TestBuddyView = 'initial' | 'mcq' | 'coding_difficulty' | 'coding_workspace' | 'mcq_results';
type ActiveResultTab = 'run' | 'submit';


const DifficultyButton: React.FC<{
    difficulty: CodingProblemDifficulty;
    onClick: () => void;
    isLoading: boolean;
}> = ({ difficulty, onClick, isLoading }) => {
    const colorClasses = {
        Easy: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/50',
        Medium: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800/50',
        Hard: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/50',
    };
    return (
        <button
            onClick={onClick}
            disabled={isLoading}
            className={`px-6 py-3 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${colorClasses[difficulty]}`}
        >
            {isLoading ? 'Generating...' : difficulty}
        </button>
    );
};

const ResultBadge: React.FC<{ status: SubmissionStatus }> = ({ status }) => {
    const baseClass = 'px-3 py-1 text-sm font-bold rounded-full flex items-center gap-1.5';
    switch (status) {
        case 'Accepted':
            return <span className={`${baseClass} bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200`}><CheckCircleIcon className="h-4 w-4"/> Accepted</span>;
        case 'Wrong Answer':
            return <span className={`${baseClass} bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200`}><XCircleIcon className="h-4 w-4"/> Wrong Answer</span>;
        case 'Runtime Error':
            return <span className={`${baseClass} bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200`}>⚡ Runtime Error</span>;
        case 'Time Limit Exceeded':
            return <span className={`${baseClass} bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200`}>⏳ Time Limit Exceeded</span>;
        case 'Compilation Error':
             return <span className={`${baseClass} bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200`}>⚠️ Compilation Error</span>;
        default:
            return <span className={`${baseClass} bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200`}>{status}...</span>;
    }
};

interface TestBuddyProps {
    learnVaultContent: string;
    onNavigateToVault: () => void;
    onQuizComplete: (result: { score: number, totalQuestions: number, topic: string }) => void;
    onCodingAttempt: (attempt: Omit<CodingAttempt, 'timestamp'>) => void;
}

const TestBuddy: React.FC<TestBuddyProps> = ({ learnVaultContent, onNavigateToVault, onQuizComplete, onCodingAttempt }) => {
    const [view, setView] = useState<TestBuddyView>('initial');
    const [isTopicProgramming, setIsTopicProgramming] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // MCQ State
    const [mcqQuestions, setMcqQuestions] = useState<QuizQuestion[]>([]);
    const [mcqTopic, setMcqTopic] = useState('');
    const [currentMcqIndex, setCurrentMcqIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
    const [isMcqTimerRunning, setIsMcqTimerRunning] = useState(false);
    
    // Coding State
    const [codingProblems, setCodingProblems] = useState<CodingProblem[]>([]);
    const [activeCodingProblemIndex, setActiveCodingProblemIndex] = useState(0);
    const [language, setLanguage] = useState<Language>('javascript');
    const [code, setCode] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);
    const [runResults, setRunResults] = useState<TestCaseResult[] | null>(null);
    const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
    const [hint, setHint] = useState<string | null>(null);
    const [isHintLoading, setIsHintLoading] = useState(false);
    const [activeResultTab, setActiveResultTab] = useState<ActiveResultTab>('run');
    const [isCodingTimerRunning, setIsCodingTimerRunning] = useState(false);
    const [codingDifficulty, setCodingDifficulty] = useState<CodingProblemDifficulty | null>(null);
    
    // Check if topic is programming-related on mount
    useEffect(() => {
        if (!learnVaultContent.trim()) {
            setIsLoading(false);
            return;
        }
        isProgrammingTopic(learnVaultContent).then(isProgramming => {
            setIsTopicProgramming(isProgramming);
            setIsLoading(false);
        });
    }, [learnVaultContent]);

    // Update code editor when active problem or language changes
    useEffect(() => {
        if (codingProblems.length > 0) {
            const problem = codingProblems[activeCodingProblemIndex];
            setCode(problem.starterCode[language]);
            setRunResults(null);
            setSubmissionResult(null);
            setHint(null);
        }
    }, [activeCodingProblemIndex, language, codingProblems]);
    
    const handleStartMcq = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { questions, topic } = await generateQuiz(learnVaultContent, { numQuestions: 15 });
            setMcqQuestions(questions);
            setMcqTopic(topic);
            setCurrentMcqIndex(0);
            setUserAnswers({});
            setSelectedAnswer(null);
            setView('mcq');
            setIsMcqTimerRunning(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate MCQ test.');
        } finally {
            setIsLoading(false);
        }
    }, [learnVaultContent]);

    const handleNextQuestion = () => {
        const newAnswers = { ...userAnswers, [currentMcqIndex]: selectedAnswer! };
        setUserAnswers(newAnswers);
        setSelectedAnswer(null);

        if (currentMcqIndex < mcqQuestions.length - 1) {
            setCurrentMcqIndex(prev => prev + 1);
        } else {
            finishMcq(newAnswers);
        }
    };
    
    const finishMcq = useCallback((finalAnswers: Record<number, string>) => {
        setIsMcqTimerRunning(false);
        let score = 0;
        mcqQuestions.forEach((q, index) => {
            if (finalAnswers[index] === q.correctAnswer) {
                score++;
            }
        });
        onQuizComplete({ score, totalQuestions: mcqQuestions.length, topic: mcqTopic });
        setView('mcq_results');
    }, [mcqQuestions, mcqTopic, onQuizComplete]);

    const handleFetchCodingProblems = useCallback(async (difficulty: CodingProblemDifficulty) => {
        setIsLoading(true);
        setCodingDifficulty(difficulty);
        setError(null);
        try {
            const fetchedProblems = await generateCodingProblems(learnVaultContent, difficulty);
            setCodingProblems(fetchedProblems);
            setActiveCodingProblemIndex(0);
            setView('coding_workspace');
            setIsCodingTimerRunning(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch problems.');
        } finally {
            setIsLoading(false);
        }
    }, [learnVaultContent]);

    const handleRunCode = async () => {
        const problem = codingProblems[activeCodingProblemIndex];
        if (!problem || isExecuting) return;
        setIsExecuting(true);
        setActiveResultTab('run');
        setSubmissionResult(null);
        setHint(null);

        const examplePromises = problem.examples.map(example =>
            createSubmission(language, code, example.input, example.output)
        );
        const results = await Promise.all(examplePromises);

        setRunResults(results.map((res, index) => ({
            input: problem.examples[index].input,
            expectedOutput: problem.examples[index].output,
            userOutput: res.stdout || res.stderr || 'No output',
            status: res.status === 'Accepted' ? 'Passed' : 'Failed',
            error: res.stderr || res.compile_output
        })));
        
        setIsExecuting(false);
    };

    const handleSubmitCode = async () => {
        const problem = codingProblems[activeCodingProblemIndex];
        if (!problem || isExecuting) return;
        setIsExecuting(true);
        setActiveResultTab('submit');
        setRunResults(null);
        setHint(null);

        for (const testCase of problem.testCases) {
            setSubmissionResult({ status: 'Running' });
            const result = await createSubmission(language, code, testCase.input, testCase.output);
            if (result.status !== 'Accepted') {
                const finalResult = { ...result, failedInput: testCase.input };
                setSubmissionResult(finalResult);
                onCodingAttempt({
                    problemTitle: problem.title,
                    problemDifficulty: problem.difficulty,
                    language,
                    code,
                    status: result.status
                });
                setIsExecuting(false);
                return;
            }
        }

        const finalResult: SubmissionResult = { status: 'Accepted' };
        setSubmissionResult(finalResult);
        onCodingAttempt({
             problemTitle: problem.title,
             problemDifficulty: problem.difficulty,
             language,
             code,
             status: finalResult.status
        });
        setIsExecuting(false);
        setIsCodingTimerRunning(false);
    };
    
    const handleGetHint = async () => {
        const problem = codingProblems[activeCodingProblemIndex];
        if (!problem || isHintLoading || !submissionResult || submissionResult.status === 'Accepted') return;

        setIsHintLoading(true);
        setHint('');
        try {
            const hintText = await generateCodeHint(problem, code, {
                input: submissionResult.failedInput || '',
                expected: submissionResult.expectedOutput || '',
                actual: submissionResult.stdout || ''
            });
            setHint(hintText);
        } catch (e) {
            console.error(e);
            setHint("Sorry, an error occurred while generating a hint.");
        } finally {
            setIsHintLoading(false);
        }
    };


    const resetState = () => {
        setView('initial');
        setError(null);
        // Reset all states if needed
    };

    if (isLoading) {
        return <div className="text-lg font-medium text-gray-700 dark:text-gray-300">Analyzing your LearnVault content...</div>;
    }
    
    if (!learnVaultContent.trim()) {
        return (
            <div className="mt-8 p-8 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
                <BrainCircuitIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Your LearnVault is Empty</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2 mb-6">TestBuddy uses your LearnVault content to generate tests. Please add materials first.</p>
                <button onClick={onNavigateToVault} className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition-colors">Go to LearnVault</button>
            </div>
        );
    }
    
    const renderInitial = () => (
        <div className="w-full max-w-2xl mx-auto text-center p-4">
            <div className="flex justify-center items-center gap-3 mb-4">
                <FlaskConicalIcon className="h-10 w-10 text-blue-500" />
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">TestBuddy</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-8">Choose a test type to challenge your knowledge.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button onClick={handleStartMcq} disabled={isLoading} className="flex items-center justify-center gap-2 px-6 py-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <PencilRulerIcon className="h-6 w-6 text-blue-500"/>
                    MCQ Test
                </button>
                {isTopicProgramming && (
                    <button onClick={() => setView('coding_difficulty')} className="flex items-center justify-center gap-2 px-6 py-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <CodeIcon className="h-6 w-6 text-purple-500"/>
                        Coding Challenge
                    </button>
                )}
            </div>
            {error && <p className="mt-4 text-red-500">{error}</p>}
        </div>
    );
    
    const renderMcq = () => {
        if (mcqQuestions.length === 0) return null;
        const question = mcqQuestions[currentMcqIndex];
        return (
            <div className="w-full max-w-2xl mx-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{mcqTopic}</h2>
                    <Timer initialMinutes={10} onTimeout={() => finishMcq(userAnswers)} isRunning={isMcqTimerRunning} />
                </div>
                <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-semibold text-blue-500 mb-2">Question {currentMcqIndex + 1} of {mcqQuestions.length}</p>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">{question.questionText}</h3>
                    <div className="space-y-3">
                        {question.options.map((option, index) => (
                            <label key={index} className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedAnswer === option ? 'border-blue-500 bg-blue-50 dark:bg-gray-700' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                                <input type="radio" name="option" value={option} checked={selectedAnswer === option} onChange={() => setSelectedAnswer(option)} className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300"/>
                                <span className="ml-3 font-medium text-gray-800 dark:text-gray-200">{option}</span>
                            </label>
                        ))}
                    </div>
                    <div className="mt-8 text-right">
                        <button onClick={handleNextQuestion} disabled={!selectedAnswer} className="flex items-center gap-2 px-8 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 transition-colors">
                            {currentMcqIndex < mcqQuestions.length - 1 ? 'Next' : 'Finish'} <ArrowRightIcon className="h-5 w-5"/>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderMcqResults = () => {
        const score = Object.values(userAnswers).filter((answer, index) => answer === mcqQuestions[index].correctAnswer).length;
        return (
            <div className="w-full max-w-2xl mx-auto text-center bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Quiz Complete!</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Topic: <span className="font-semibold">{mcqTopic}</span></p>
                <div className="mb-8">
                    <p className="text-lg text-gray-700 dark:text-gray-200">Your Score:</p>
                    <p className="text-6xl font-bold text-blue-500 my-2">{score} <span className="text-4xl text-gray-500 dark:text-gray-400">/ {mcqQuestions.length}</span></p>
                </div>
                <button onClick={resetState} className="px-8 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition-colors">
                    Back to TestBuddy Home
                </button>
            </div>
        );
    };

    const renderCodingDifficulty = () => (
         <div className="w-full max-w-4xl mx-auto text-center p-4">
             <button onClick={() => setView('initial')} className="text-sm text-blue-500 hover:underline mb-4">&larr; Back to Test Selection</button>
            <div className="flex justify-center items-center gap-3 mb-4">
                <CodeIcon className="h-10 w-10 text-blue-500" />
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Coding Arena</h1>
            </div>
             <p className="text-gray-600 dark:text-gray-400 mb-8">Select a difficulty to generate coding problems.</p>
            <div className="flex justify-center gap-4 mb-8">
                {(['Easy', 'Medium', 'Hard'] as CodingProblemDifficulty[]).map(d => 
                    <DifficultyButton key={d} difficulty={d} onClick={() => handleFetchCodingProblems(d)} isLoading={isLoading && codingDifficulty === d} />
                )}
            </div>
            {error && <p className="mt-4 text-red-500">{error}</p>}
        </div>
    );

    const renderCodingWorkspace = () => {
        if (codingProblems.length === 0) return null;
        const problem = codingProblems[activeCodingProblemIndex];
        const difficultyColors: Record<CodingProblemDifficulty, string> = {
            Easy: 'text-green-600 dark:text-green-400', Medium: 'text-yellow-600 dark:text-yellow-400', Hard: 'text-red-600 dark:text-red-400',
        };

        return (
            <div className="flex flex-col h-full w-full overflow-hidden">
                 {/* Header */}
                 <div className="flex-shrink-0 flex justify-between items-center p-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setView('coding_difficulty')} className="text-sm text-blue-500 hover:underline">&larr; Back</button>
                        <div className="flex gap-1">
                            {codingProblems.map((p, index) => (
                                <button key={p.id} onClick={() => setActiveCodingProblemIndex(index)} className={`px-3 py-1 text-sm rounded-md ${activeCodingProblemIndex === index ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                                    {`Q${index + 1}`}
                                </button>
                            ))}
                        </div>
                    </div>
                    <Timer initialMinutes={25} onTimeout={handleSubmitCode} isRunning={isCodingTimerRunning} />
                </div>

                <div className="flex-grow flex gap-4 overflow-hidden p-4">
                    {/* Left Panel */}
                    <div className="w-1/2 flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <h2 className="text-2xl font-bold">{problem.title}</h2>
                            <p className={`font-semibold ${difficultyColors[problem.difficulty]}`}>{problem.difficulty}</p>
                        </div>
                        <div className="p-4 space-y-4 overflow-y-auto">
                            <p className="whitespace-pre-wrap">{problem.description}</p>
                            {problem.examples.map((ex, i) => (
                                <div key={i} className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg"><p className="font-semibold">Example {i + 1}:</p><pre className="mt-1 p-2 bg-gray-200 dark:bg-gray-700 rounded text-sm"><code><span className="font-bold">Input:</span> {ex.input}<br/><span className="font-bold">Output:</span> {ex.output}</code></pre>{ex.explanation && <p className="text-sm mt-1"><strong>Explanation:</strong> {ex.explanation}</p>}</div>
                            ))}
                            <div><h4 className="font-bold">Constraints:</h4><ul className="list-disc list-inside text-sm">{problem.constraints.map((c, i) => <li key={i}>{c}</li>)}</ul></div>
                        </div>
                    </div>

                    {/* Right Panel */}
                    <div className="w-1/2 flex flex-col gap-4">
                        <div className="flex-grow flex flex-col bg-gray-800 rounded-lg shadow overflow-hidden">
                            <div className="p-2 bg-gray-700 flex items-center"><select value={language} onChange={e => setLanguage(e.target.value as Language)} className="bg-gray-800 text-white rounded px-2 py-1 text-sm border-none focus:ring-2 focus:ring-blue-500"><option value="javascript">JavaScript</option><option value="python">Python</option><option value="java">Java</option><option value="c">C</option></select></div>
                            <div className="flex-grow relative"><CodeEditor language={language} value={code} onChange={setCode} /></div>
                        </div>
                         <div className="flex-shrink-0 h-48 bg-white dark:bg-gray-800 rounded-lg shadow p-2 flex flex-col">
                            {/* Result Tabs */}
                            <div className="flex border-b border-gray-200 dark:border-gray-700">
                                <button onClick={() => setActiveResultTab('run')} className={`px-4 py-2 text-sm font-semibold ${activeResultTab === 'run' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}>Run Results</button>
                                <button onClick={() => setActiveResultTab('submit')} className={`px-4 py-2 text-sm font-semibold ${activeResultTab === 'submit' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-500'}`}>Submission</button>
                            </div>
                            {/* Result Content */}
                            <div className="flex-grow p-2 overflow-y-auto">
                                {activeResultTab === 'run' && (
                                    runResults ? (
                                        <div className="space-y-2">
                                            {runResults.map((res, i) => (
                                                <div key={i} className={`p-2 rounded-md ${res.status === 'Passed' ? 'bg-green-50 dark:bg-green-900/40' : 'bg-red-50 dark:bg-red-900/40'}`}>
                                                    <p className="font-semibold text-sm flex items-center gap-2">{res.status === 'Passed' ? <CheckCircleIcon className="h-5 w-5 text-green-500"/> : <XCircleIcon className="h-5 w-5 text-red-500"/>} Test Case #{i + 1}</p>
                                                     {res.status === 'Failed' && (
                                                        <div className="text-xs font-mono mt-1 pl-7">
                                                            <p>Expected: <code className="bg-gray-200 dark:bg-gray-700 p-1 rounded">{res.expectedOutput}</code></p>
                                                            <p>Got: <code className="bg-gray-200 dark:bg-gray-700 p-1 rounded">{res.userOutput}</code></p>
                                                        </div>
                                                     )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : <p className="text-sm text-gray-500">Run code to see results against examples.</p>
                                )}
                                {activeResultTab === 'submit' && (
                                    submissionResult ? (
                                        <div>
                                            <ResultBadge status={submissionResult.status} />
                                            {submissionResult.status !== 'Accepted' && submissionResult.status !== 'Running' && (
                                                <div className="mt-2 text-sm">
                                                    <p className="font-semibold">Failed on hidden test case.</p>
                                                    <button onClick={handleGetHint} disabled={isHintLoading} className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50">
                                                        <SparklesIcon className="h-4 w-4" />
                                                        {isHintLoading ? 'Thinking...' : 'Get a Hint'}
                                                    </button>
                                                    {hint && (
                                                        <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg italic text-gray-700 dark:text-gray-300">
                                                          <p className="flex items-start gap-2"><LightbulbIcon className="h-4 w-4 mt-0.5 text-yellow-500 flex-shrink-0" /> {hint}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ) : <p className="text-sm text-gray-500">Submit code to see the final result.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 flex justify-end gap-4 p-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <button onClick={handleRunCode} disabled={isExecuting} className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"><PlayIcon className="h-5 w-5"/> Run Code</button>
                    <button onClick={handleSubmitCode} disabled={isExecuting} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 disabled:opacity-50"><SendHorizonalIcon className="h-5 w-5"/> Submit Code</button>
                </div>
            </div>
        );
    };

    switch(view) {
        case 'initial': return renderInitial();
        case 'mcq': return renderMcq();
        case 'mcq_results': return renderMcqResults();
        case 'coding_difficulty': return renderCodingDifficulty();
        case 'coding_workspace': return renderCodingWorkspace();
        default: return renderInitial();
    }
};

export default TestBuddy;