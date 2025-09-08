
import React, { useState, useEffect, useMemo } from 'react';
import { generateMockTest } from '../services/geminiService';
import { type QuizQuestion, type TestConfig } from '../types';
import { BrainCircuitIcon, FlaskConicalIcon, ClockIcon, CheckCircleIcon, XCircleIcon, LightbulbIcon, ClipboardCheckIcon } from './Icons';

type TestState = 'config' | 'loading' | 'active' | 'results';

interface TestBuddyProps {
    learnVaultContent: string;
    onNavigateToVault: () => void;
}

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

const TestBuddy: React.FC<TestBuddyProps> = ({ learnVaultContent, onNavigateToVault }) => {
    const [testState, setTestState] = useState<TestState>('config');
    const [config, setConfig] = useState<TestConfig>({ numQuestions: 5, timeLimit: 10 });
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [userAnswers, setUserAnswers] = useState<(string | null)[]>([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const [finalScore, setFinalScore] = useState(0);
    const [timeTaken, setTimeTaken] = useState(0);
    
    // Timer countdown logic
    useEffect(() => {
        if (testState !== 'active' || timeLeft <= 0) return;
        const timerId = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);
        return () => clearInterval(timerId);
    }, [testState, timeLeft]);

    // Auto-submit when timer runs out
    useEffect(() => {
        if (testState === 'active' && timeLeft === 0) {
            handleSubmitTest();
        }
    }, [timeLeft, testState]);

    const handleStartTest = async () => {
        if (!learnVaultContent.trim()) {
            setError('Your LearnVault is empty. Please add some notes first.');
            return;
        }
        setError(null);
        setTestState('loading');
        try {
            const generatedQuestions = await generateMockTest(learnVaultContent, config);
             if (generatedQuestions.length === 0) {
                 throw new Error("The AI could not generate a test from the provided content.");
            }
            setQuestions(generatedQuestions);
            setUserAnswers(new Array(generatedQuestions.length).fill(null));
            setTimeLeft(config.timeLimit * 60);
            setCurrentQIndex(0);
            setTestState('active');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
            setTestState('config');
        }
    };

    const handleAnswerSelect = (option: string) => {
        setUserAnswers(prev => {
            const newAnswers = [...prev];
            newAnswers[currentQIndex] = option;
            return newAnswers;
        });
    };

    const handleSubmitTest = () => {
        let score = 0;
        for (let i = 0; i < questions.length; i++) {
            if (userAnswers[i] === questions[i].correctAnswer) {
                score++;
            }
        }
        setFinalScore(score);
        setTimeTaken(config.timeLimit * 60 - timeLeft);
        setTestState('results');
    };
    
    const handleReset = () => {
        setTestState('config');
        setQuestions([]);
        setUserAnswers([]);
        setError(null);
    };

    const renderConfigScreen = () => (
        <div className="w-full max-w-2xl mx-auto text-center flex flex-col items-center justify-center h-full">
            <div className="flex justify-center items-center gap-3 mb-4">
                <FlaskConicalIcon className="h-10 w-10 text-blue-500" />
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">TestBuddy Mock Exam</h1>
            </div>

            {error && <p className="mb-4 text-red-500 dark:text-red-400 font-medium animate-fade-in">{error}</p>}

            {!learnVaultContent.trim() ? (
                <div className="mt-8 p-8 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <BrainCircuitIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Your LearnVault is Empty</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-2 mb-6">
                        TestBuddy uses your LearnVault content to create mock tests. Please add materials first.
                    </p>
                    <button onClick={onNavigateToVault} className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition-colors">
                        Go to LearnVault
                    </button>
                </div>
            ) : (
                <div className="w-full bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mt-6">
                    <p className="text-gray-600 dark:text-gray-400 mb-6">Configure your timed test based on your LearnVault content.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                            <label htmlFor="numQuestions" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Number of Questions:</label>
                            <select id="numQuestions" value={config.numQuestions} onChange={e => setConfig({...config, numQuestions: parseInt(e.target.value)})}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="5">5 Questions</option>
                                <option value="10">10 Questions</option>
                                <option value="15">15 Questions</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="timeLimit" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Time Limit:</label>
                            <select id="timeLimit" value={config.timeLimit} onChange={e => setConfig({...config, timeLimit: parseInt(e.target.value)})}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="10">10 Minutes</option>
                                <option value="20">20 Minutes</option>
                                <option value="30">30 Minutes</option>
                            </select>
                        </div>
                    </div>
                    <button onClick={handleStartTest} className="mt-8 w-full px-8 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition-colors">
                        Start Test
                    </button>
                </div>
            )}
        </div>
    );

    const renderLoadingScreen = () => (
        <div className="text-center flex flex-col items-center justify-center h-full">
            <svg className="animate-spin mx-auto h-12 w-12 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">Generating your test, good luck!</p>
        </div>
    );

    const renderActiveTestScreen = () => (
        <div className="flex flex-col h-full">
            <header className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 rounded-t-lg">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Mock Test in Progress</h2>
                    <div className="flex items-center gap-4">
                         <div className={`flex items-center gap-2 font-mono text-lg font-semibold px-3 py-1 rounded-md ${timeLeft < 60 ? 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50' : 'text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700'}`}>
                             <ClockIcon className="h-5 w-5" />
                             {formatTime(timeLeft)}
                         </div>
                        <button onClick={handleSubmitTest} className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors">Submit Test</button>
                    </div>
                </div>
            </header>
            <div className="flex-grow flex overflow-hidden">
                <aside className="w-1/4 p-4 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
                    <h3 className="font-semibold mb-3">Questions</h3>
                    <div className="grid grid-cols-4 gap-2">
                        {questions.map((_, index) => (
                            <button key={index} onClick={() => setCurrentQIndex(index)} 
                                className={`h-10 w-10 rounded-md flex items-center justify-center font-semibold transition-colors ${
                                    index === currentQIndex 
                                    ? 'bg-blue-500 text-white ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-gray-800' 
                                    : userAnswers[index] !== null 
                                    ? 'bg-gray-200 dark:bg-gray-700' 
                                    : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}>
                                {index + 1}
                            </button>
                        ))}
                    </div>
                </aside>
                <main className="w-3/4 p-6 overflow-y-auto">
                    <p className="text-sm font-semibold text-blue-500 mb-2">Question {currentQIndex + 1} of {questions.length}</p>
                    <h2 className="text-2xl font-bold mb-6">{questions[currentQIndex].questionText}</h2>
                    <div className="space-y-3">
                        {questions[currentQIndex].options.map((option, index) => (
                            <button key={index} onClick={() => handleAnswerSelect(option)}
                                className={`w-full text-left flex items-center p-4 border rounded-lg transition-all ${
                                    userAnswers[currentQIndex] === option
                                    ? 'border-blue-500 bg-blue-50 dark:bg-gray-700 ring-2 ring-blue-500'
                                    : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                                }`}>
                                <span className="mr-4 h-6 w-6 flex-shrink-0 rounded-full border-2 flex items-center justify-center font-mono text-sm ${userAnswers[currentQIndex] === option ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-400'}">
                                    {String.fromCharCode(65 + index)}
                                </span>
                                <span className="font-medium">{option}</span>
                            </button>
                        ))}
                    </div>
                    <div className="mt-8 flex justify-between">
                        <button onClick={() => setCurrentQIndex(p => p - 1)} disabled={currentQIndex === 0}
                            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50">Previous</button>
                        <button onClick={() => setCurrentQIndex(p => p + 1)} disabled={currentQIndex === questions.length - 1}
                             className="px-6 py-2 bg-gray-200 dark:bg-gray-700 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50">Next</button>
                    </div>
                </main>
            </div>
        </div>
    );

    const renderResultsScreen = () => (
        <div className="w-full max-w-4xl mx-auto p-4">
             <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <ClipboardCheckIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Test Complete!</h2>
                <div className="flex justify-center gap-8 my-6">
                    <div>
                        <p className="text-lg text-gray-600 dark:text-gray-400">Your Score</p>
                        <p className="text-5xl font-bold text-blue-500">{finalScore} <span className="text-3xl text-gray-500 dark:text-gray-400">/ {questions.length}</span></p>
                    </div>
                     <div>
                        <p className="text-lg text-gray-600 dark:text-gray-400">Time Taken</p>
                        <p className="text-5xl font-bold text-blue-500">{formatTime(timeTaken)}</p>
                    </div>
                </div>
                <button onClick={handleReset} className="px-8 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition-colors">
                    Take Another Test
                </button>
            </div>
            <div className="mt-8">
                <h3 className="text-2xl font-bold mb-4">Review Your Answers</h3>
                <div className="space-y-4">
                    {questions.map((q, index) => {
                        const userAnswer = userAnswers[index];
                        const isCorrect = userAnswer === q.correctAnswer;
                        return (
                            <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                                <p className="font-semibold text-lg mb-2">Q{index + 1}: {q.questionText}</p>
                                <div className={`flex items-center gap-3 p-3 rounded-md mb-2 text-sm ${isCorrect ? 'bg-green-50 dark:bg-green-900/50 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/50 text-red-800 dark:text-red-300'}`}>
                                    {isCorrect ? <CheckCircleIcon className="h-5 w-5" /> : <XCircleIcon className="h-5 w-5" />}
                                    <span>Your answer: {userAnswer || "Not answered"}</span>
                                </div>
                                {!isCorrect && (
                                     <div className="flex items-center gap-3 p-3 rounded-md mb-2 text-sm bg-gray-100 dark:bg-gray-700">
                                        <CheckCircleIcon className="h-5 w-5 text-gray-600 dark:text-gray-400"/>
                                        <span>Correct answer: {q.correctAnswer}</span>
                                    </div>
                                )}
                                <div className="flex items-start gap-3 p-3 rounded-md bg-blue-50 dark:bg-gray-700/50">
                                    <LightbulbIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5"/>
                                    <p className="text-sm text-blue-800 dark:text-blue-300">{q.explanation}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );

    switch (testState) {
        case 'loading': return renderLoadingScreen();
        case 'active': return renderActiveTestScreen();
        case 'results': return renderResultsScreen();
        case 'config':
        default:
            return renderConfigScreen();
    }
};

export default TestBuddy;