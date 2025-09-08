
import React, { useState, useEffect } from 'react';
import { startLearnGuideSession, getConceptExplanation, reexplainConcept } from '../services/geminiService';
import { type Concept } from '../types';
import { BrainCircuitIcon, LightbulbIcon, CheckIcon, HelpCircleIcon, ArrowRightIcon } from './Icons';

interface LearnGuideProps {
    knowledgeBase: string;
    onNavigateToVault: () => void;
}

type GuideState = 'loading' | 'active' | 'reexplaining' | 'completed' | 'error';
type UserUnderstanding = 'unknown' | 'understood' | 'needs_help';

const LoadingSpinner: React.FC<{ text: string }> = ({ text }) => (
    <div className="flex flex-col items-center justify-center text-center h-full">
        <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-lg font-medium text-gray-700 dark:text-gray-300">{text}</p>
    </div>
);

const LearnGuide: React.FC<LearnGuideProps> = ({ knowledgeBase, onNavigateToVault }) => {
    const [state, setState] = useState<GuideState>('loading');
    const [conceptTitles, setConceptTitles] = useState<string[]>([]);
    const [currentConcept, setCurrentConcept] = useState<Concept | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [understanding, setUnderstanding] = useState<UserUnderstanding>('unknown');
    const [errorMessage, setErrorMessage] = useState<string>('');

    useEffect(() => {
        if (!knowledgeBase.trim()) return;

        const initializeSession = async () => {
            try {
                const { concepts, firstConcept } = await startLearnGuideSession(knowledgeBase);
                if (!concepts || concepts.length === 0 || !firstConcept) {
                    throw new Error("AI could not create a valid learning path from this content.");
                }
                setConceptTitles(concepts);
                setCurrentConcept(firstConcept);
                setState('active');
            } catch (err) {
                setErrorMessage(err instanceof Error ? err.message : 'An unknown error occurred.');
                setState('error');
            }
        };
        initializeSession();
    }, [knowledgeBase]);

    const handleNotClear = async () => {
        if (!currentConcept) return;
        setState('reexplaining');
        try {
            const simplerConcept = await reexplainConcept(currentConcept.title, currentConcept.explanation);
            setCurrentConcept(simplerConcept);
        } catch (err) {
            // If re-explaining fails, just go back to active state with original concept
            console.error(err);
        } finally {
            setState('active');
            setUnderstanding('unknown');
        }
    };
    
    const handleUnderstood = () => {
        setUnderstanding('understood');
    };
    
    const handleNextConcept = async () => {
        const nextIndex = currentIndex + 1;
        if (nextIndex >= conceptTitles.length) {
            setState('completed');
            return;
        }

        setState('loading');
        setUnderstanding('unknown');
        try {
            const learned = conceptTitles.slice(0, nextIndex);
            const nextConcept = await getConceptExplanation(knowledgeBase, conceptTitles[nextIndex], learned);
            setCurrentConcept(nextConcept);
            setCurrentIndex(nextIndex);
            setState('active');
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'An unknown error occurred.');
            setState('error');
        }
    };
    
    if (!knowledgeBase.trim()) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                <div className="mt-8 p-8 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <BrainCircuitIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Your LearnVault is Empty</h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-2 mb-6">
                        LearnGuide needs content from your vault to create a lesson. Please add materials first.
                    </p>
                    <button onClick={onNavigateToVault} className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition-colors">
                        Go to LearnVault
                    </button>
                </div>
            </div>
        );
    }

    if (state === 'loading') {
        return <LoadingSpinner text="Building your learning path..." />;
    }
    
    if (state === 'reexplaining') {
        return <LoadingSpinner text="Finding a simpler explanation..." />;
    }

    if (state === 'error') {
        return (
            <div className="text-center">
                <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">{errorMessage}</p>
                <button onClick={onNavigateToVault} className="px-6 py-2 bg-gray-200 dark:bg-gray-700 font-semibold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">Back to Vault</button>
            </div>
        );
    }
    
    if (state === 'completed') {
        return (
            <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Session Complete!</h2>
                <p className="text-lg text-green-600 dark:text-green-400 mb-6">Great! You’ve mastered the material. 🚀</p>
                <button onClick={onNavigateToVault} className="px-8 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600">
                    Return to Vault
                </button>
            </div>
        )
    }

    return (
        <div className="w-full max-w-3xl mx-auto animate-fade-in">
             <div className="mb-6">
                 <button onClick={onNavigateToVault} className="text-sm text-blue-500 hover:underline mb-4">&larr; Exit Session</button>
                 <h1 className="text-3xl font-bold text-gray-800 dark:text-white">LearnGuide Session</h1>
                 <div className="flex justify-between items-center mt-2">
                    <p className="text-sm font-semibold text-blue-500">Concept {currentIndex + 1} of {conceptTitles.length}</p>
                 </div>
                 <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-1">
                    <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${((currentIndex + 1) / conceptTitles.length) * 100}%` }}></div>
                 </div>
             </div>
             
             <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{currentConcept?.title}</h2>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {currentConcept?.explanation}
                </p>
                
                {currentConcept && currentConcept.examples.length > 0 && (
                     <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100 mb-2 flex items-center gap-2">
                            <LightbulbIcon className="h-5 w-5 text-yellow-500" />
                            Examples
                        </h3>
                        <ul className="space-y-2 list-disc list-inside text-gray-600 dark:text-gray-400">
                            {currentConcept.examples.map((ex, i) => <li key={i}>{ex}</li>)}
                        </ul>
                    </div>
                )}
             </div>

             <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                {understanding === 'understood' ? (
                     <div className="flex items-center justify-between animate-fade-in">
                        <p className="font-semibold text-green-700 dark:text-green-300">Great! Ready for the next one?</p>
                        <button onClick={handleNextConcept} className="px-6 py-2 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 flex items-center gap-2">
                            Next Concept <ArrowRightIcon className="h-5 w-5"/>
                        </button>
                     </div>
                ) : (
                    <div className="flex items-center justify-center gap-4">
                        <button onClick={handleUnderstood} className="px-5 py-2.5 bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 font-semibold rounded-lg hover:bg-green-200 dark:hover:bg-green-900 flex items-center gap-2 transition-colors">
                            <CheckIcon className="h-5 w-5"/>
                            Understood
                        </button>
                         <button onClick={handleNotClear} className="px-5 py-2.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300 font-semibold rounded-lg hover:bg-yellow-200 dark:hover:bg-yellow-900 flex items-center gap-2 transition-colors">
                            <HelpCircleIcon className="h-5 w-5"/>
                            Not Clear
                        </button>
                    </div>
                )}
             </div>
        </div>
    );
};

export default LearnGuide;
