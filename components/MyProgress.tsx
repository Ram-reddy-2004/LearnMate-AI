import React, { useMemo, useState, useEffect } from 'react';
import { type McqResult, type UserData } from '../types';
import { generateProgressInsights } from '../services/geminiService';
import { LightbulbIcon, PencilRulerIcon, TrendingUpIcon, TargetIcon, AwardIcon, ClockIcon, HelpCircleIcon, CodeIcon } from './Icons';

interface MyProgressProps {
    userData: UserData | null;
    mcqHistory: McqResult[];
    onNavigateToQuiz: () => void;
}

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string; color: string }> = ({ icon, title, value, color }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex items-center space-x-4">
        <div className={`p-3 rounded-full ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
            <p className="text-xl font-bold text-gray-800 dark:text-white">{value}</p>
        </div>
    </div>
);

const LineChart: React.FC<{ data: { x: number, y: number }[] }> = ({ data }) => {
    if (data.length < 2) {
        return <div className="h-64 flex items-center justify-center text-gray-500 dark:text-gray-400">Complete at least two quizzes to see your progress trend.</div>;
    }

    const width = 500;
    const height = 250;
    const padding = 40;

    const maxX = data.length - 1;
    const points = data.map((point, i) => {
        const x = (i / maxX) * (width - 2 * padding) + padding;
        const y = height - padding - (point.y / 100) * (height - 2 * padding);
        return `${x},${y}`;
    }).join(' ');
    
    const yAxisLabels = [0, 25, 50, 75, 100];
    const xAxisLabels = data.map((_, i) => i + 1);

    return (
         <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            {/* Y-axis grid lines and labels */}
            {yAxisLabels.map(label => {
                const y = height - padding - (label / 100) * (height - 2 * padding);
                return (
                    <g key={label}>
                        <line x1={padding} y1={y} x2={width - padding} y2={y} className="stroke-gray-200 dark:stroke-gray-700" strokeDasharray="2,2" />
                        <text x={padding - 10} y={y + 5} className="text-xs fill-current text-gray-500 dark:text-gray-400" textAnchor="end">{label}%</text>
                    </g>
                )
            })}
             {/* X-axis labels */}
            {xAxisLabels.map((label, i) => {
                 const x = (i / maxX) * (width - 2 * padding) + padding;
                 return (
                    <text key={label} x={x} y={height - padding + 20} className="text-xs fill-current text-gray-500 dark:text-gray-400" textAnchor="middle">Quiz {label}</text>
                 )
            })}

            {/* Polyline for the chart */}
            <polyline fill="none" className="stroke-blue-500" strokeWidth="2" points={points} />
            
             {/* Circles for data points */}
            {data.map((point, i) => {
                const x = (i / maxX) * (width - 2 * padding) + padding;
                const y = height - padding - (point.y / 100) * (height - 2 * padding);
                return <circle key={i} cx={x} cy={y} r="3" className="fill-blue-500 stroke-white dark:stroke-gray-800" strokeWidth="2" />;
            })}
        </svg>
    );
};


const MyProgress: React.FC<MyProgressProps> = ({ userData, mcqHistory, onNavigateToQuiz }) => {
    const [insights, setInsights] = useState<string>('');
    const [isLoadingInsights, setIsLoadingInsights] = useState<boolean>(false);

    const stats = useMemo(() => {
        const quizzesTaken = mcqHistory.length;

        const totalCorrect = mcqHistory.reduce((sum, result) => sum + result.score, 0);
        const totalQuestions = mcqHistory.reduce((sum, result) => sum + result.total, 0);
        const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
        
        const chartData = mcqHistory.map((result, index) => ({
            x: index,
            y: Math.round((result.score / result.total) * 100),
        }));
        
        const solvedProblems = userData?.progress?.solvedProblems || 0;

        let weakestTopic;
        if (quizzesTaken === 0) {
             weakestTopic = { name: 'N/A', color: 'bg-gray-500', icon: <TargetIcon className="h-6 w-6 text-white"/> };
        } else if (quizzesTaken < 2) {
             weakestTopic = { name: "Not enough data yet", color: "bg-gray-500", icon: <HelpCircleIcon className="h-6 w-6 text-white"/>, };
        } else {
            const topicStats: Record<string, { totalScore: number; totalQuestions: number }> = {};
            mcqHistory.forEach(result => {
                if (!topicStats[result.topic]) {
                    topicStats[result.topic] = { totalScore: 0, totalQuestions: 0 };
                }
                topicStats[result.topic].totalScore += result.score;
                topicStats[result.topic].totalQuestions += result.total;
            });

            let weakestTopicName = '';
            let lowestAccuracy = 101;

            Object.entries(topicStats).forEach(([topic, data]) => {
                if (data.totalQuestions > 0) {
                    const accuracy = (data.totalScore / data.totalQuestions) * 100;
                    if (accuracy < lowestAccuracy) {
                        lowestAccuracy = accuracy;
                        weakestTopicName = topic;
                    }
                }
            });

            if (lowestAccuracy > 70) {
                weakestTopic = { name: "All topics strong!", color: "bg-green-500", icon: <AwardIcon className="h-6 w-6 text-white"/> };
            } else {
                let color = "bg-red-500";
                if (lowestAccuracy >= 50) {
                    color = "bg-orange-500";
                }
                weakestTopic = { name: weakestTopicName, color: color, icon: <TargetIcon className="h-6 w-6 text-white"/> };
            }
        }

        return {
            overallAccuracy,
            quizzesTaken,
            chartData,
            weakestTopic,
            solvedProblems,
        };
    }, [mcqHistory, userData]);

    useEffect(() => {
        if (mcqHistory.length > 0 || stats.solvedProblems > 0) {
            const fetchInsights = async () => {
                setIsLoadingInsights(true);
                const summary = `
                    Quizzes Taken: ${stats.quizzesTaken}
                    Quiz Accuracy: ${stats.overallAccuracy}%
                    Recent Quiz Scores (as percentages): ${stats.chartData.slice(-5).map(d => `${d.y}%`).join(', ')}
                    Coding Problems Solved: ${stats.solvedProblems}
                    Identified Weakest Quiz Topic: ${stats.weakestTopic.name.includes('data') || stats.weakestTopic.name.includes('strong') ? 'N/A' : stats.weakestTopic.name}
                `;
                const aiInsight = await generateProgressInsights(summary);
                setInsights(aiInsight);
                setIsLoadingInsights(false);
            };
            fetchInsights();
        }
    }, [mcqHistory, stats]);

    if (mcqHistory.length === 0 && stats.solvedProblems === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                <div className="mt-8 p-8 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <LightbulbIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Start Your Learning Journey, {userData?.firstName}!</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-2 mb-6">
                        You haven't taken any tests yet. Complete a quiz or coding challenge to start tracking your progress.
                    </p>
                    <button onClick={onNavigateToQuiz} className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition-colors flex items-center gap-2 mx-auto">
                        <PencilRulerIcon className="h-5 w-5"/>
                        Go to SmartQuiz
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="p-4 md:p-6 space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Welcome Back, {userData?.firstName}!</h1>
            <p className="text-gray-600 dark:text-gray-400">Here's a snapshot of your progress. Keep up the great work!</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={<TrendingUpIcon className="h-6 w-6 text-white"/>} title="Quiz Accuracy" value={`${stats.overallAccuracy}%`} color="bg-green-500" />
                <StatCard icon={<CodeIcon className="h-6 w-6 text-white"/>} title="Problems Solved" value={`${stats.solvedProblems}`} color="bg-indigo-500" />
                <StatCard icon={<PencilRulerIcon className="h-6 w-6 text-white"/>} title="Quizzes Taken" value={stats.quizzesTaken.toString()} color="bg-yellow-500" />
                <StatCard icon={stats.weakestTopic.icon} title="Weakest Topic" value={stats.weakestTopic.name} color={stats.weakestTopic.color} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Quiz Performance Over Time</h2>
                    <LineChart data={stats.chartData} />
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex flex-col">
                     <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">AI Coach Insights</h2>
                     <div className="flex-grow p-4 bg-blue-50 dark:bg-gray-700/50 rounded-lg flex items-center">
                        {isLoadingInsights ? (
                             <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <span>Generating feedback...</span>
                            </div>
                        ) : (
                             <p className="text-gray-700 dark:text-gray-300 italic">"{insights}"</p>
                        )}
                     </div>
                </div>
            </div>

             {mcqHistory.length > 0 && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Recent Quizzes</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="p-3">Topic</th>
                                    <th className="p-3">Score</th>
                                    <th className="p-3">Accuracy</th>
                                    <th className="p-3">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mcqHistory.slice().reverse().slice(0, 5).map((attempt, index) => (
                                    <tr key={index} className="border-b border-gray-100 dark:border-gray-700/50">
                                        <td className="p-3 font-medium">{attempt.topic}</td>
                                        <td className="p-3">{attempt.score} / {attempt.total}</td>
                                        <td className="p-3 font-semibold text-blue-600 dark:text-blue-400">{Math.round((attempt.score / attempt.total) * 100)}%</td>
                                        <td className="p-3 text-sm text-gray-500 dark:text-gray-400">{new Date(attempt.completedAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyProgress;