
import React, { useState, useEffect } from 'react';
import { generateQuiz } from '../services/geminiService';
import { type QuizQuestion, type QuizConfig } from '../types';
import { PencilRulerIcon, LightbulbIcon, CheckCircleIcon, XCircleIcon, BrainCircuitIcon } from './Icons';

type QuizState = 'config' | 'loading' | 'active' | 'results';

interface SmartQuizProps {
    learnVaultContent: string;
    onNavigateToVault: () => void;
    onQuizComplete: (result: { score: number, totalQuestions: number }) => void;
}

const SmartQuiz: React.FC<SmartQuizProps> = ({ learnVaultContent, onNavigateToVault, onQuizComplete }) => {
    const [quizState, setQuizState] = useState<QuizState>('config');
    const [config, setConfig] = useState<QuizConfig>({ numQuestions: 5 });
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
    const [score, setScore] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (quizState === 'results') {
            onQuizComplete({ score, totalQuestions: questions.length });
        }
    }, [quizState]);

    const handleGenerateQuiz = async () => {
        if (!learnVaultContent.trim()) {
            setError('Your LearnVault is empty. Please add some notes first.');
            return;
        }
        setError(null);
        setQuizState('loading');
        try {
            const generatedQuestions = await generateQuiz(learnVaultContent, config);
            if (generatedQuestions.length === 0) {
                 throw new Error("The AI could not generate a quiz from the provided text. Please try with different content.");
            }
            setQuestions(generatedQuestions);
            setQuizState('active');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
            setQuizState('config');
        }
    };
    
    const handleAnswerSelect = (option: string) => {
        if (isAnswerSubmitted) return;
        setSelectedAnswer(option);
    };

    const handleSubmitAnswer = () => {
        if (selectedAnswer === null) return;
        
        const isCorrect = selectedAnswer === questions[currentQuestionIndex].correctAnswer;
        if (isCorrect) {
            setScore(prev => prev + 1);
        }
        setIsAnswerSubmitted(true);
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setIsAnswerSubmitted(false);
        } else {
            setQuizState('results');
        }
    };

    const handleReset = () => {
        setQuizState('config');
        setQuestions([]);
        setCurrentQuestionIndex(0);
        setSelectedAnswer(null);
        setIsAnswerSubmitted(false);
        setScore(0);
        setError(null);
    };

    const renderConfigScreen = () => (
        <div className="w-full max-w-3xl mx-auto text-center">
             <div className="flex justify-center items-center gap-3 mb-4">
                <PencilRulerIcon className="h-10 w-10 text-blue-500"/>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">SmartQuiz Generator</h1>
            </div>

            {error && <p className="mb-4 text-red-500 dark:text-red-400 font-medium animate-fade-in">{error}</p>}

            { !learnVaultContent.trim() ? (
                <div className="mt-8 p-8 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <BrainCircuitIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Your LearnVault is Empty</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-2 mb-6">
                        Please add notes, documents, or other materials to your LearnVault first. SmartQuiz uses that content to create your quizzes.
                    </p>
                    <button onClick={onNavigateToVault} className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition-colors">
                        Go to LearnVault
                    </button>
                </div>
            ) : (
                <>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">
                        Ready to test your knowledge? I'll generate a quiz based on the content in your LearnVault.
                    </p>
                    <div className="mt-6 flex justify-center items-center gap-4">
                        <label htmlFor="numQuestions" className="font-medium text-gray-700 dark:text-gray-200">Number of Questions:</label>
                        <select 
                            id="numQuestions"
                            value={config.numQuestions} 
                            onChange={(e) => setConfig({ ...config, numQuestions: parseInt(e.target.value, 10)})}
                            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="5">5</option>
                            <option value="10">10</option>
                        </select>
                    </div>
                    <div className="mt-8">
                        <button onClick={handleGenerateQuiz} className="px-8 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 disabled:bg-blue-300 transition-colors">
                            Generate Quiz
                        </button>
                    </div>
                </>
            )}
        </div>
    );
    
    const renderLoadingScreen = () => (
        <div className="text-center">
            <svg className="animate-spin mx-auto h-12 w-12 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-lg font-medium text-gray-700 dark:text-gray-300">Generating your quiz...</p>
        </div>
    );

    const renderQuizScreen = () => {
        const question = questions[currentQuestionIndex];
        return (
            <div className="w-full max-w-2xl mx-auto">
                 <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-semibold text-blue-500">Question {currentQuestionIndex + 1} of {questions.length}</p>
                        <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">Score: {score}</p>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}></div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">{question.questionText}</h2>
                    <div className="space-y-4">
                        {question.options.map((option, index) => {
                            const isCorrect = option === question.correctAnswer;
                            const isSelected = option === selectedAnswer;
                            let optionClass = "border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700";
                             if (isAnswerSubmitted) {
                                if (isCorrect) {
                                    optionClass = "border-green-500 bg-green-50 dark:bg-green-900/50 text-green-800 dark:text-green-300";
                                } else if (isSelected && !isCorrect) {
                                    optionClass = "border-red-500 bg-red-50 dark:bg-red-900/50 text-red-800 dark:text-red-300";
                                }
                            } else if (isSelected) {
                                optionClass = "border-blue-500 bg-blue-50 dark:bg-gray-700 ring-2 ring-blue-500";
                            }

                            return (
                                <button
                                    key={index}
                                    onClick={() => handleAnswerSelect(option)}
                                    disabled={isAnswerSubmitted}
                                    className={`w-full text-left flex items-center p-4 border-2 rounded-lg transition-all ${optionClass} disabled:cursor-not-allowed`}
                                >
                                    <span className="flex-1 font-medium text-gray-800 dark:text-gray-200">{option}</span>
                                     {isAnswerSubmitted && isCorrect && <CheckCircleIcon className="h-6 w-6 text-green-500" />}
                                     {isAnswerSubmitted && isSelected && !isCorrect && <XCircleIcon className="h-6 w-6 text-red-500" />}
                                </button>
                            );
                        })}
                    </div>
                    
                    {isAnswerSubmitted && (
                        <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg animate-fade-in">
                            <div className="flex items-start gap-3">
                                <LightbulbIcon className="h-6 w-6 text-yellow-500 flex-shrink-0 mt-1" />
                                <div>
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">Explanation</h4>
                                    <p className="text-gray-700 dark:text-gray-300 mt-1">{question.explanation}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mt-8 text-center">
                         {!isAnswerSubmitted ? (
                            <button onClick={handleSubmitAnswer} disabled={selectedAnswer === null} className="px-8 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors">
                                Submit
                            </button>
                        ) : (
                            <button onClick={handleNextQuestion} className="px-8 py-3 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition-colors">
                                {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

     const renderResultsScreen = () => (
        <div className="w-full max-w-2xl mx-auto text-center bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Quiz Complete!</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Well done on completing the quiz.</p>
            <div className="mb-8">
                <p className="text-lg text-gray-700 dark:text-gray-200">Your Score:</p>
                <p className="text-6xl font-bold text-blue-500 my-2">{score} <span className="text-4xl text-gray-500 dark:text-gray-400">/ {questions.length}</span></p>
            </div>
            <button onClick={handleReset} className="px-8 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition-colors">
                Create Another Quiz
            </button>
        </div>
    );

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4">
            {quizState === 'config' && renderConfigScreen()}
            {quizState === 'loading' && renderLoadingScreen()}
            {quizState === 'active' && renderQuizScreen()}
            {quizState === 'results' && renderResultsScreen()}
        </div>
    );
};

export default SmartQuiz;
