import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { type UserData, type QuizResult, type TestResult } from '../types';
import { LightbulbIcon, TrendingUpIcon, CodeIcon, TargetIcon, PencilRulerIcon as QuizzesTakenIcon, FlaskConicalIcon, PencilRulerIcon } from './Icons';
import { db } from '../services/firebaseConfig';
import { generateProgressInsights, determineWeakestTopic } from '../services/geminiService';
import { ModuleLoadingIndicator } from './LoadingIndicators';

interface MyProgressProps {
    userData: UserData | null;
    onNavigateToQuiz: () => void;
    onNavigateToTestBuddy: () => void;
}

const StatCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    value: string | number;
    iconBgColor: string;
}> = ({ icon, title, value, iconBgColor }) => (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-start space-x-4 min-h-[100px]">
        <div className={`flex-shrink-0 h-12 w-12 rounded-full flex items-center justify-center ${iconBgColor}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-xl font-bold text-gray-800 dark:text-white break-words">{value}</p>
        </div>
    </div>
);

const QuizPerformanceChart: React.FC<{ data: QuizResult[] }> = ({ data }) => {
    if (!data || data.length < 2) {
        return (
             <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 p-4 text-center">
                Complete at least two quizzes to see your performance over time.
            </div>
        )
    }

    const width = 500;
    const height = 250;
    const padding = 40;

    const points = data.map((quiz, i) => {
        const x = data.length > 1 ? (i / (data.length - 1)) * (width - padding * 2) + padding : width / 2;
        const y = height - padding - ((quiz.score / 100) * (height - padding * 2));
        return { x, y };
    });

    const pathD = points.map((p, i) => i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`).join(' ');

    const yAxisLabels = [0, 25, 50, 75, 100];
    const xAxisLabels = data.map((_, i) => `Quiz ${i + 1}`);

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" aria-label="Quiz Performance Chart">
            {/* Y Axis Grid Lines & Labels */}
            {yAxisLabels.map(label => {
                const y = height - padding - ((label / 100) * (height - padding * 2));
                return (
                    <g key={label}>
                        <line x1={padding} y1={y} x2={width - padding} y2={y} strokeDasharray="4" className="stroke-gray-200 dark:stroke-gray-700" />
                        <text x={padding - 10} y={y + 5} textAnchor="end" className="text-xs fill-current text-gray-500 dark:text-gray-400">
                            {label}%
                        </text>
                    </g>
                );
            })}

            {/* X Axis Labels */}
            {xAxisLabels.slice(0, 1).concat(xAxisLabels.slice(-1)).map((label, i) => {
                 const index = i === 0 ? 0 : xAxisLabels.length - 1;
                 const x = (index / (xAxisLabels.length - 1)) * (width - padding * 2) + padding;
                return (
                    <text key={label} x={x} y={height - padding + 20} textAnchor="middle" className="text-xs fill-current text-gray-500 dark:text-gray-400">
                        {label}
                    </text>
                );
            })}
            
            <path d={pathD} fill="none" strokeWidth="3" className="stroke-blue-500" />
            
            {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="4" className="fill-blue-500" />
            ))}
        </svg>
    );
};


const MyProgress: React.FC<MyProgressProps> = ({ userData, onNavigateToQuiz, onNavigateToTestBuddy }) => {
    const { user } = useAuth();
    const [insights, setInsights] = useState<string>('');
    const [weakestTopic, setWeakestTopic] = useState<string>('');
    const [quizHistory, setQuizHistory] = useState<QuizResult[]>([]);
    const [codingHistory, setCodingHistory] = useState<TestResult[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [isInsightsLoading, setIsInsightsLoading] = useState(true);

    // Effect to fetch history with real-time listeners
    useEffect(() => {
        if (!user) {
            setQuizHistory([]);
            setCodingHistory([]);
            setIsLoadingHistory(false);
            return;
        }

        setIsLoadingHistory(true);

        const quizUnsubscribe = db.collection('users').doc(user.uid).collection('quizResults')
            .orderBy('attemptedAt', 'asc')
            .onSnapshot(snapshot => {
                const quizzes = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        ...data,
                        quizId: doc.id,
                        attemptedAt: data.attemptedAt?.toDate().toISOString() || new Date().toISOString(),
                    } as QuizResult;
                });
                setQuizHistory(quizzes);
                setIsLoadingHistory(false); // Considered loaded after first fetch
            }, err => {
                console.error("Error fetching quiz history:", err);
                setIsLoadingHistory(false);
            });

        const codingUnsubscribe = db.collection('users').doc(user.uid).collection('codingResults')
            .orderBy('attemptedAt', 'asc')
            .onSnapshot(snapshot => {
                const tests = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        ...data,
                        testId: doc.id,
                        attemptedAt: data.attemptedAt?.toDate().toISOString() || new Date().toISOString(),
                    } as TestResult;
                });
                setCodingHistory(tests);
            }, err => {
                console.error("Error fetching coding history:", err);
            });

        return () => {
            quizUnsubscribe();
            codingUnsubscribe();
        };
    }, [user]);

    // Effect to generate AI insights when history changes
    useEffect(() => {
        if (isLoadingHistory) {
            return;
        }

        const hasData = quizHistory.length > 0 || codingHistory.length > 0;
        if (!hasData) {
            setIsInsightsLoading(false);
            return;
        }
        
        setIsInsightsLoading(true);
        let isMounted = true;

        const generateInsights = async () => {
             try {
                // Prepare summary for Gemini
                const quizSummary = quizHistory.map(q => `- Quiz: "${q.title}", Score: ${q.score}%`).join('\n');
                const codingSummary = codingHistory.map(c => `- Coding Test: "${c.title}", Status: ${c.status}`).join('\n');
                const performanceSummary = `
                    Quiz Performance:
                    ${quizSummary}

                    Coding Performance:
                    ${codingSummary}
                `;

                // Fire off Gemini calls
                const [insightText, topicText] = await Promise.all([
                    generateProgressInsights(performanceSummary),
                    determineWeakestTopic(performanceSummary),
                ]);

                if (!isMounted) return;

                setInsights(insightText);
                setWeakestTopic(topicText);

            } catch (error) {
                console.error("Failed to generate insights:", error);
                if (isMounted) {
                    setInsights("Could not load AI insights at this time. Please try again later.");
                    setWeakestTopic("N/A");
                }
            } finally {
                if (isMounted) {
                    setIsInsightsLoading(false);
                }
            }
        };

        generateInsights();
        return () => { isMounted = false };

    }, [quizHistory, codingHistory, isLoadingHistory]);


    const performanceStats = useMemo(() => {
        const quizzesTaken = quizHistory.length;
        const totalQuizScore = quizHistory.reduce((sum, quiz) => sum + quiz.score, 0);
        const quizAccuracy = quizzesTaken > 0 ? Math.round(totalQuizScore / quizzesTaken) : 0;
        
        const passedTests = codingHistory.filter(test => test.status === 'Passed');
        const problemsSolved = new Set(passedTests.map(test => test.testId)).size;

        return {
            quizzesTaken,
            quizAccuracy,
            problemsSolved,
        };
    }, [quizHistory, codingHistory]);

    const getFirstName = () => {
        const firestoreName = userData?.profile?.name;
        if (firestoreName && firestoreName.trim()) {
            return firestoreName.trim().split(' ')[0];
        }
        if (user?.email) {
            return user.email.split('@')[0];
        }
        return 'Learner';
    };
    
    const firstName = getFirstName();
    const hasProgress = !isLoadingHistory && (quizHistory.length > 0 || codingHistory.length > 0);

    if (!hasProgress && !isLoadingHistory) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
               <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm max-w-lg p-10">
                   <LightbulbIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                   <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Start Your Learning Journey!</h2>
                   <p className="text-gray-600 dark:text-gray-400 mt-4">
                       You haven't taken any tests yet. Complete a quiz or coding challenge to start tracking your progress.
                   </p>
                    <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                        <button
                            onClick={onNavigateToQuiz}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition-colors"
                        >
                           <PencilRulerIcon className="h-5 w-5" />
                           Take a Quiz
                       </button>
                       <button
                           onClick={onNavigateToTestBuddy}
                           className="flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg font-semibold text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                       >
                           <FlaskConicalIcon className="h-5 w-5" />
                           Start Test
                       </button>
                   </div>
               </div>
           </div>
       );
    }
    
    return (
        <div className="p-4 md:p-6 space-y-8 max-w-7xl mx-auto animate-fade-in">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Welcome Back, {firstName}! 😊</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Here's a snapshot of your progress. Keep up the great work!</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    icon={<TrendingUpIcon className="h-6 w-6 text-green-700 dark:text-green-300"/>} 
                    title="Quiz Accuracy" 
                    value={`${performanceStats.quizAccuracy}%`} 
                    iconBgColor="bg-green-100 dark:bg-green-900/50"
                />
                <StatCard 
                    icon={<CodeIcon className="h-6 w-6 text-blue-700 dark:text-blue-300"/>} 
                    title="Problems Solved" 
                    value={performanceStats.problemsSolved} 
                    iconBgColor="bg-blue-100 dark:bg-blue-900/50"
                />
                <StatCard 
                    icon={<QuizzesTakenIcon className="h-6 w-6 text-yellow-700 dark:text-yellow-300"/>} 
                    title="Quizzes Taken" 
                    value={performanceStats.quizzesTaken} 
                    iconBgColor="bg-yellow-100 dark:bg-yellow-900/50"
                />
                <StatCard 
                    icon={<TargetIcon className="h-6 w-6 text-orange-700 dark:text-orange-300"/>} 
                    title="Weakest Topic" 
                    value={isInsightsLoading ? 'Analyzing...' : weakestTopic || 'N/A'}
                    iconBgColor="bg-orange-100 dark:bg-orange-900/50"
                />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Quiz Performance Over Time</h2>
                    <div className="h-64">
                         {isLoadingHistory ? <ModuleLoadingIndicator text="" /> : <QuizPerformanceChart data={quizHistory} />}
                    </div>
                </div>

                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col">
                     <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">AI Coach Insights</h2>
                     <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg flex-grow flex items-center justify-center">
                        {isInsightsLoading ? <ModuleLoadingIndicator text="" /> : (
                            <p className="text-gray-700 dark:text-gray-300 italic">
                                "{insights}"
                            </p>
                        )}
                     </div>
                </div>
            </div>
        </div>
    );
};

export default MyProgress;