
import React, { useMemo, useState, useEffect } from 'react';
import { type QuizResult } from '../types';
import { generateProgressInsights } from '../services/geminiService';
import { LightbulbIcon, PencilRulerIcon, TrendingUpIcon, TargetIcon, AwardIcon, ClockIcon } from './Icons';

interface MyProgressProps {
    quizHistory: QuizResult[];
    onNavigateToQuiz: () => void;
}

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string; color: string }> = ({ icon, title, value, color }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 flex items-center space-x-4">
        <div className={`p-3 rounded-full ${color}`}>
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
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


const MyProgress: React.FC<MyProgressProps> = ({ quizHistory, onNavigateToQuiz }) => {
    const [insights, setInsights] = useState<string>('');
    const [isLoadingInsights, setIsLoadingInsights] = useState<boolean>(false);

    const stats = useMemo(() => {
        if (quizHistory.length === 0) {
            return {
                overallAccuracy: 0,
                quizzesTaken: 0,
                lastScore: null,
                weakestTopic: 'N/A',
                chartData: [],
            };
        }

        const totalCorrect = quizHistory.reduce((sum, result) => sum + result.score, 0);
        const totalQuestions = quizHistory.reduce((sum, result) => sum + result.totalQuestions, 0);
        const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
        const lastResult = quizHistory[quizHistory.length - 1];
        const lastScore = `${lastResult.score}/${lastResult.totalQuestions}`;
        
        const chartData = quizHistory.map((result, index) => ({
            x: index,
            y: Math.round((result.score / result.totalQuestions) * 100),
        }));

        return {
            overallAccuracy,
            quizzesTaken: quizHistory.length,
            lastScore,
            weakestTopic: "General Knowledge", // Simulated
            chartData,
        };
    }, [quizHistory]);

    useEffect(() => {
        if (quizHistory.length > 0) {
            const fetchInsights = async () => {
                setIsLoadingInsights(true);
                const summary = `
                    Quizzes Taken: ${stats.quizzesTaken}
                    Overall Accuracy: ${stats.overallAccuracy}%
                    Recent Scores (as percentages): ${stats.chartData.slice(-5).map(d => `${d.y}%`).join(', ')}
                `;
                const aiInsight = await generateProgressInsights(summary);
                setInsights(aiInsight);
                setIsLoadingInsights(false);
            };
            fetchInsights();
        }
    }, [quizHistory, stats.quizzesTaken, stats.overallAccuracy, stats.chartData]);

    if (quizHistory.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                <div className="mt-8 p-8 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <LightbulbIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Start Your Learning Journey!</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-2 mb-6">
                        You haven't taken any quizzes yet. Complete a quiz in SmartQuiz to start tracking your progress here.
                    </p>
                    <button onClick={onNavigateToQuiz} className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition-colors flex items-center gap-2 mx-auto">
                        <PencilRulerIcon className="h-5 w-5"/>
                        Take a Quiz
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="p-4 md:p-6 space-y-6">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">MyProgress Dashboard</h1>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={<TrendingUpIcon className="h-6 w-6 text-white"/>} title="Overall Accuracy" value={`${stats.overallAccuracy}%`} color="bg-green-500" />
                <StatCard icon={<TargetIcon className="h-6 w-6 text-white"/>} title="Weakest Topic" value={stats.weakestTopic} color="bg-red-500" />
                <StatCard icon={<ClockIcon className="h-6 w-6 text-white"/>} title="Quizzes Taken" value={stats.quizzesTaken.toString()} color="bg-yellow-500" />
                <StatCard icon={<AwardIcon className="h-6 w-6 text-white"/>} title="Last Score" value={stats.lastScore!} color="bg-indigo-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Performance Over Time</h2>
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
        </div>
    );
};

export default MyProgress;
