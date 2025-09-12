import React, { useState, useEffect, useMemo, useRef } from 'react';
import { startLearnGuideSession, getConceptExplanation, reexplainConcept, explainCodeSnippet } from '../services/geminiService';
import { type Concept } from '../types';
import { BrainCircuitIcon, CheckIcon, HelpCircleIcon, ArrowRightIcon, Volume2Icon, PauseIcon, SparklesIcon, ClipboardIcon } from './Icons';

interface LearnGuideProps {
    knowledgeBase: string;
    onNavigateToVault: () => void;
}

type GuideState = 'loading' | 'active' | 'reexplaining' | 'completed' | 'error';
type UserUnderstanding = 'unknown' | 'understood' | 'needs_help';

const SimpleMarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
    // This regex splits the text by **bold** and `inline code` markers, keeping the markers.
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g).filter(Boolean);

    return (
        <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300">
            {parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i}>{part.substring(2, part.length - 2)}</strong>;
                }
                if (part.startsWith('`') && part.endsWith('`')) {
                    return (
                        <code key={i} className="bg-gray-200 dark:bg-gray-700 rounded px-1 py-0.5 font-mono text-sm">
                            {part.substring(1, part.length - 1)}
                        </code>
                    );
                }
                return <React.Fragment key={i}>{part}</React.Fragment>;
            })}
        </p>
    );
};

const CodeCard: React.FC<{ language: string, code: string }> = ({ language, code }) => {
    const [copied, setCopied] = useState(false);
    const [showExplanation, setShowExplanation] = useState(false);
    const [explanation, setExplanation] = useState<string>('');
    const [isExplaining, setIsExplaining] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleExplain = async () => {
        if (showExplanation) {
            setShowExplanation(false);
            return;
        }
        
        // If we already have the explanation, just show it.
        if (explanation) {
            setShowExplanation(true);
            return;
        }

        setIsExplaining(true);
        try {
            const explanationText = await explainCodeSnippet(code);
            setExplanation(explanationText);
            setShowExplanation(true);
        } catch (error) {
            console.error(error);
            setExplanation("Sorry, I couldn't generate an explanation for this code.");
            setShowExplanation(true);
        } finally {
            setIsExplaining(false);
        }
    };
    
    const highlightSyntax = (codeStr: string) => {
        // This robust method uses a tokenizer and placeholders to prevent HTML escaping issues.
        const parts: (string | { type: 'string' | 'comment', content: string })[] = [];
        let lastIndex = 0;
        
        // Regex to find strings (handling escaped quotes) and comments.
        const tokenizerRegex = /(\/\*[\s\S]*?\*\/|\/\/.*)|("(?:\\.|[^"])*"|'(?:\\.|[^'])*'|`(?:\\.|[^`])*`)/g;

        let match;
        while ((match = tokenizerRegex.exec(codeStr)) !== null) {
            // 1. Add the plain code part before the matched token.
            if (match.index > lastIndex) {
                parts.push(codeStr.substring(lastIndex, match.index));
            }
            
            // 2. Add the matched token (string or comment).
            if (match[1]) { // It's a comment
                parts.push({ type: 'comment', content: match[1] });
            } else if (match[2]) { // It's a string
                parts.push({ type: 'string', content: match[2] });
            }
            
            lastIndex = tokenizerRegex.lastIndex;
        }

        // 3. Add any remaining code after the last match.
        if (lastIndex < codeStr.length) {
            parts.push(codeStr.substring(lastIndex));
        }

        const highlightCodeSegment = (segment: string) => {
            const keywords = ['let', 'const', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'import', 'export', 'from', 'async', 'await', 'class', 'extends', 'super', 'new', 'try', 'catch', 'finally', 'throw'];
            const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
            
            // Use placeholders for replacements
            let tempHighlighted = segment
                .replace(keywordRegex, '[[KEYWORD]]$1[[/KEYWORD]]')
                .replace(/\b(\d+)\b/g, '[[NUMBER]]$1[[/NUMBER]]')
                .replace(/(\w+)(?=\()/g, '[[FUNCTION_CALL]]$1[[/FUNCTION_CALL]]');

            // Escape the string with placeholders
            const escaped = tempHighlighted
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            // Replace placeholders with final HTML
            return escaped
                .replace(/\[\[KEYWORD\]\]/g, '<span class="text-blue-600 dark:text-blue-400 font-semibold">')
                .replace(/\[\[\/KEYWORD\]\]/g, '</span>')
                .replace(/\[\[NUMBER\]\]/g, '<span class="text-purple-600 dark:text-purple-400">')
                .replace(/\[\[\/NUMBER\]\]/g, '</span>')
                .replace(/\[\[FUNCTION_CALL\]\]/g, '<span class="text-yellow-700 dark:text-yellow-400">')
                .replace(/\[\[\/FUNCTION_CALL\]\]/g, '</span>');
        };

        // 4. Map over the parts and apply the correct highlighting.
        return parts.map(part => {
            if (typeof part === 'string') {
                return highlightCodeSegment(part);
            }
            
            // For strings and comments, just escape them and wrap them in a span.
            const escapedContent = part.content
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            if (part.type === 'comment') {
                return `<span class="text-gray-500 italic">${escapedContent}</span>`;
            }
            if (part.type === 'string') {
                return `<span class="text-green-600 dark:text-green-400">${escapedContent}</span>`;
            }
            return '';
        }).join('');
    };

    return (
        <div className="bg-white dark:bg-gray-900/70 my-4 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-2 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                <span className="text-xs font-sans text-gray-500 dark:text-gray-400 font-semibold uppercase">{language || 'code'}</span>
                <div className="flex items-center gap-3">
                    <button onClick={handleExplain} disabled={isExplaining} className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 transition-colors disabled:opacity-50">
                        <SparklesIcon className="h-4 w-4 text-purple-500" />
                        {isExplaining ? 'Thinking...' : (showExplanation ? 'Hide' : 'Explain')}
                    </button>
                    <button onClick={handleCopy} className="flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                        {copied ? <CheckIcon className="h-4 w-4 text-green-500" /> : <ClipboardIcon className="h-4 w-4" />}
                        {copied ? 'Copied' : 'Copy code'}
                    </button>
                </div>
            </div>
            <div className="p-4 overflow-x-auto">
                <pre><code 
                    className="font-mono text-sm text-gray-800 dark:text-gray-200"
                    dangerouslySetInnerHTML={{ __html: highlightSyntax(code) }} 
                /></pre>
            </div>
            {showExplanation && (
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 text-sm bg-gray-50 dark:bg-gray-800/50">
                    <SimpleMarkdownRenderer text={explanation} />
                </div>
            )}
        </div>
    );
};


// Renders text and highlights the currently spoken word. It also handles basic markdown for bold text.
const HighlightableText: React.FC<{
    text: string;
    currentWordIndex: number;
    wordOffset: number; // The number of words that came before this text block
}> = ({ text = '', currentWordIndex, wordOffset }) => {
    // Split text into parts with markdown bold syntax
    const parts = useMemo(() => text.split(/(\*\*.*?\*\*)/g).filter(Boolean), [text]);
    let cumulativeWordCount = wordOffset;

    return (
        <>
            {parts.map((part, i) => {
                const isBold = part.startsWith('**') && part.endsWith('**');
                const content = isBold ? part.substring(2, part.length - 2) : part;
                const words = content.split(/\s+/).filter(Boolean);

                const renderedWords = words.map((word, j) => {
                    const wordGlobalIndex = cumulativeWordCount + j;
                    const isHighlighted = wordGlobalIndex === currentWordIndex;
                    return (
                        <span key={j} className={`transition-colors duration-150 ${isHighlighted ? 'bg-yellow-300 dark:bg-yellow-400 rounded' : 'bg-transparent'}`}>
                            {word}{' '}
                        </span>
                    );
                });
                
                cumulativeWordCount += words.length;

                if (isBold) {
                    return <strong key={i}>{renderedWords}</strong>;
                }
                return <React.Fragment key={i}>{renderedWords}</React.Fragment>;
            })}
        </>
    );
};


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
    const [understoodIndices, setUnderstoodIndices] = useState<Set<number>>(new Set());
    const [understanding, setUnderstanding] = useState<UserUnderstanding>('unknown');
    const [errorMessage, setErrorMessage] = useState<string>('');

    // State for Text-to-Speech
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [currentWordIndex, setCurrentWordIndex] = useState(-1);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoiceURI, setSelectedVoiceURI] = useState<string | null>(null);
    const voicesLoaded = useRef(false);

    const { contentToSpeak, wordOffsets } = useMemo(() => {
        if (!currentConcept) return { contentToSpeak: '', wordOffsets: {} };
        
        const sections = [
            { id: 'title', text: currentConcept.title },
            { id: 'def_head', text: "Definition" },
            { id: 'def_body', text: currentConcept.definition },
            { id: 'exp_head', text: "Explanation" },
            ...currentConcept.explanation.map((p, i) => ({ id: `exp_bullet_${i}`, text: p })),
            { id: 'ex_head', text: "Examples" },
            ...currentConcept.examples.map((e, i) => ({ id: `ex_bullet_${i}`, text: e }))
        ];

        let fullText = '';
        const offsets: Record<string, number> = {};
        let cumulativeWords = 0;
        
        sections.forEach(section => {
            const isCodeBlock = section.text.trim().startsWith('```');
            let textToProcess: string;

            if (isCodeBlock) {
                textToProcess = "Here’s an example code snippet for you to try.";
            } else {
                // Strip markdown bold for speech so it doesn't read the asterisks
                textToProcess = section.text.replace(/\*\*(.*?)\*\*/g, '$1');
            }

            offsets[section.id] = cumulativeWords;
            fullText += textToProcess + '. ';
            cumulativeWords += textToProcess.split(/\s+/).filter(Boolean).length;
        });


        return { contentToSpeak: fullText, wordOffsets: offsets };

    }, [currentConcept]);
    
    // Load available speech synthesis voices
    useEffect(() => {
        if (!('speechSynthesis' in window)) return;

        const loadVoices = () => {
            const availableVoices = speechSynthesis.getVoices().filter(v => v.lang.startsWith('en-'));
            setVoices(availableVoices);
            
            if (!voicesLoaded.current && availableVoices.length > 0) {
                const indianVoice = availableVoices.find(v => v.lang === 'en-IN');
                const googleUSVoice = availableVoices.find(v => v.name === 'Google US English');
                const usVoice = availableVoices.find(v => v.lang === 'en-US');
                const defaultVoice = indianVoice || googleUSVoice || usVoice || availableVoices[0];
                if (defaultVoice) {
                    setSelectedVoiceURI(defaultVoice.voiceURI);
                }
                voicesLoaded.current = true;
            }
        };
        speechSynthesis.addEventListener('voiceschanged', loadVoices);
        loadVoices();

        return () => {
            speechSynthesis.removeEventListener('voiceschanged', loadVoices);
            if (speechSynthesis.speaking) {
                speechSynthesis.cancel();
            }
        };
    }, []);

    // Initialize session
    useEffect(() => {
        if (!knowledgeBase.trim()) {
            setState('active'); // Go to active state to show the "empty vault" message
            return;
        }

        const initializeSession = async () => {
            setState('loading');
            setUnderstoodIndices(new Set());
            try {
                const { concepts, firstConcept } = await startLearnGuideSession(knowledgeBase);
                if (!concepts || concepts.length === 0 || !firstConcept) {
                    throw new Error("AI could not create a valid learning path from this content.");
                }
                setConceptTitles(concepts);
                setCurrentConcept(firstConcept);
                setCurrentIndex(0);
                setState('active');
            } catch (err) {
                setErrorMessage(err instanceof Error ? err.message : 'An unknown error occurred.');
                setState('error');
            }
        };
        initializeSession();
    }, [knowledgeBase]);

    // Cancel speech when concept changes
    useEffect(() => {
        if ('speechSynthesis' in window && speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }
        setIsSpeaking(false);
        setIsPaused(false);
        setCurrentWordIndex(-1);
    }, [currentConcept]);

    const handleSpeak = () => {
        if (!('speechSynthesis' in window)) {
            alert("Text-to-speech is not supported in this browser.");
            return;
        }

        if (isSpeaking && !isPaused) {
            speechSynthesis.pause();
            setIsPaused(true);
        } else if (isSpeaking && isPaused) {
            speechSynthesis.resume();
            setIsPaused(false);
        } else {
            speechSynthesis.cancel(); // Clear any previous utterances
            const utterance = new SpeechSynthesisUtterance(contentToSpeak);
            const selectedVoice = voices.find(v => v.voiceURI === selectedVoiceURI);
            if (selectedVoice) utterance.voice = selectedVoice;
            utterance.rate = 1; // Normal speed

            utterance.onstart = () => {
                setIsSpeaking(true);
                setIsPaused(false);
                setCurrentWordIndex(0);
            };

            utterance.onboundary = (event) => {
                if (event.name === 'word') {
                    const textUpToBoundary = contentToSpeak.substring(0, event.charIndex);
                    const wordCount = textUpToBoundary.split(/\s+/).filter(Boolean).length;
                    setCurrentWordIndex(wordCount);
                }
            };

            utterance.onend = () => {
                setIsSpeaking(false);
                setIsPaused(false);
                setCurrentWordIndex(-1);
            };
            utterance.onerror = (event) => {
                console.error('Speech synthesis error:', event.error);
                setIsSpeaking(false);
                setIsPaused(false);
                setCurrentWordIndex(-1);
            };

            speechSynthesis.speak(utterance);
        }
    };

    const fetchConcept = async (index: number) => {
        setState('loading');
        setUnderstanding('unknown');
        try {
            const learnedConcepts = conceptTitles.slice(0, index);
            const nextConcept = await getConceptExplanation(knowledgeBase, conceptTitles[index], learnedConcepts);
            setCurrentConcept(nextConcept);
            setCurrentIndex(index);
            setState('active');
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'An unknown error occurred.');
            setState('error');
        }
    };

    const handleSetUnderstanding = async (status: UserUnderstanding) => {
        setUnderstanding(status);
        if (status === 'understood') {
            setUnderstoodIndices(prev => new Set(prev).add(currentIndex));
        }
        if (status === 'needs_help') {
            setState('reexplaining');
            try {
                const simplerConcept = await reexplainConcept(currentConcept!.title, currentConcept!.explanation);
                setCurrentConcept(simplerConcept);
            } catch (err) {
                 setErrorMessage(err instanceof Error ? err.message : 'An unknown error occurred.');
                 setState('error');
            } finally {
                setState('active');
                setUnderstanding('unknown'); // Reset for the new explanation
            }
        }
    };
    
    const handleNextConcept = () => {
        const nextIndex = currentIndex + 1;
        if (nextIndex >= conceptTitles.length) {
            setState('completed');
        } else {
            fetchConcept(nextIndex);
        }
    };

    const handleConceptSelect = (index: number) => {
        if (index === currentIndex) return;
        fetchConcept(index);
    }
    
    const renderEmptyState = () => (
        <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
            <div className="mt-8 p-8 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <BrainCircuitIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Your LearnVault is Empty</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2 mb-6">
                    Please add materials to your LearnVault first. The LearnGuide uses that content to create your lesson.
                </p>
                <button onClick={onNavigateToVault} className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition-colors">
                    Go to LearnVault
                </button>
            </div>
        </div>
    );

    const renderMainContent = () => {
        if (!currentConcept) return null;

        return (
            <>
                <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700">
                    <div className="pb-4 mb-4 flex justify-end items-center gap-2 border-b border-gray-200 dark:border-gray-700">
                        {voices.length > 0 && (
                            <select
                                value={selectedVoiceURI || ''}
                                onChange={(e) => setSelectedVoiceURI(e.target.value)}
                                disabled={isSpeaking}
                                className="bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                aria-label="Select voice"
                            >
                                {voices.map(voice => (
                                    <option key={voice.voiceURI} value={voice.voiceURI}>
                                        {voice.name} ({voice.lang})
                                    </option>
                                ))}
                            </select>
                        )}
                        <button
                            onClick={handleSpeak}
                            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                            aria-label={isSpeaking && !isPaused ? 'Pause speech' : 'Read text aloud'}
                        >
                            {isSpeaking && !isPaused ? <PauseIcon className="h-6 w-6" /> : <Volume2Icon className="h-6 w-6" />}
                        </button>
                    </div>

                    <div className="text-lg leading-relaxed">
                        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
                            <HighlightableText text={currentConcept.title} currentWordIndex={currentWordIndex} wordOffset={wordOffsets.title} />
                        </h2>
                        <div className="space-y-8 text-left">
                            <div>
                                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                                    <HighlightableText text="Definition" currentWordIndex={currentWordIndex} wordOffset={wordOffsets.def_head} />
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    <HighlightableText text={currentConcept.definition} currentWordIndex={currentWordIndex} wordOffset={wordOffsets.def_body} />
                                </p>
                            </div>
                            <div>
                                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                                        <HighlightableText text="Explanation" currentWordIndex={currentWordIndex} wordOffset={wordOffsets.exp_head} />
                                </h3>
                                <div className="space-y-3 pl-5">
                                    {currentConcept.explanation.map((point, index) => {
                                        const codeMatch = point.match(/^```(\w*)\n?([\s\S]*?)```$/);
                                        if (codeMatch) {
                                            const [, language, code] = codeMatch;
                                            return (
                                                <div key={index} className="-ml-5"> 
                                                    <CodeCard language={language} code={code.trim()} />
                                                </div>
                                            );
                                        }
                                        return (
                                            <div key={index} className="text-gray-600 dark:text-gray-400 list-item list-disc">
                                                    <HighlightableText text={point} currentWordIndex={currentWordIndex} wordOffset={wordOffsets[`exp_bullet_${index}`]} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            {currentConcept.examples?.length > 0 && (
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                                            <HighlightableText text="Examples" currentWordIndex={currentWordIndex} wordOffset={wordOffsets.ex_head} />
                                    </h3>
                                    <div className="space-y-3">
                                        {currentConcept.examples.map((example, index) => {
                                            const codeMatch = example.match(/^```(\w*)\n?([\s\S]*?)```$/);
                                            if (codeMatch) {
                                                const [, language, code] = codeMatch;
                                                return <CodeCard key={index} language={language} code={code.trim()} />;
                                            }
                                            return (
                                                <p key={index} className="text-gray-600 dark:text-gray-400 pl-5 list-disc">
                                                    <HighlightableText text={example} currentWordIndex={currentWordIndex} wordOffset={wordOffsets[`ex_bullet_${index}`]} />
                                                </p>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    {understanding === 'understood' ? (
                        <div className="text-center animate-fade-in">
                            <p className="text-green-600 dark:text-green-400 font-semibold mb-4">Nice! You mastered <span className="font-bold">{currentConcept.title}</span> 🚀</p>
                            <button
                                onClick={handleNextConcept}
                                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition-colors"
                            >
                                Next Concept <ArrowRightIcon className="h-5 w-5 ml-2" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in">
                            <button
                                onClick={() => handleSetUnderstanding('understood')}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition-colors"
                            >
                                <CheckIcon className="h-5 w-5" /> Understood
                            </button>
                            <button
                                onClick={() => handleSetUnderstanding('needs_help')}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-yellow-500 text-white font-semibold rounded-lg shadow-md hover:bg-yellow-600 transition-colors"
                            >
                                <HelpCircleIcon className="h-5 w-5" /> Not Clear
                            </button>
                        </div>
                    )}
                </div>
            </>
        );
    };

    if (!knowledgeBase.trim() && state !== 'loading') {
        return renderEmptyState();
    }

    if (state === 'loading') return <LoadingSpinner text="Building your learning path..." />;
    if (state === 'reexplaining') return <LoadingSpinner text="Simplifying the concept..." />;

    if (state === 'error') {
        return (
           <div className="text-center">
               <h2 className="text-2xl font-bold text-red-500 mb-4">An Error Occurred</h2>
               <p className="text-gray-600 dark:text-gray-400 mb-6">{errorMessage}</p>
               <button onClick={onNavigateToVault} className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition-colors">
                   Return to LearnVault
               </button>
           </div>
       );
    }
    
    if (state === 'completed') {
        return (
            <div className="text-center">
                <h2 className="text-3xl font-bold text-green-500 mb-4">Congratulations! 🎉</h2>
                <p className="text-xl text-gray-700 dark:text-gray-300">You've mastered all the concepts.</p>
                    <button onClick={onNavigateToVault} className="mt-6 px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg shadow-md hover:bg-blue-600 transition-colors">
                   Back to LearnVault
               </button>
           </div>
       );
    }
    
    return (
        <div className="w-full h-full flex gap-6 p-4 max-w-7xl mx-auto">
            {/* Left Sidebar for Concepts */}
            <aside className="w-1/3 h-full bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">Learning Path</h2>
                <nav className="space-y-2 overflow-y-auto" style={{maxHeight: 'calc(100% - 4rem)'}}>
                    {conceptTitles.map((title, index) => {
                         const isCompleted = understoodIndices.has(index);
                         const isActive = index === currentIndex;
                         let itemClass = 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700';
                         if (isActive) {
                             itemClass = 'bg-blue-500 text-white font-semibold shadow-md';
                         } else if (isCompleted) {
                             itemClass = 'text-gray-500 dark:text-gray-400';
                         }

                        return (
                            <button
                                key={index}
                                onClick={() => handleConceptSelect(index)}
                                disabled={isActive}
                                className={`w-full text-left flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${itemClass} disabled:cursor-default`}
                            >
                                {isCompleted ? (
                                    <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                                ) : (
                                    <span className={`flex-shrink-0 h-5 w-5 flex items-center justify-center text-xs font-bold rounded-full ${isActive ? 'text-blue-500 bg-white' : 'bg-gray-200 dark:bg-gray-600'}`}>
                                        {index + 1}
                                    </span>
                                )}
                                <span className="flex-grow">{title}</span>
                            </button>
                        );
                    })}
                </nav>
            </aside>

            {/* Right Main Content Area */}
            <main className="w-2/3 h-full overflow-y-auto pr-2">
                {conceptTitles.length > 0 && (
                    <div className="mb-4">
                        <div className="flex justify-between mb-1">
                            <span className="text-base font-medium text-gray-700 dark:text-gray-300">Learning Progress</span>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{understoodIndices.size} of {conceptTitles.length} mastered</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                            <div 
                                className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                                style={{ width: `${(understoodIndices.size / conceptTitles.length) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                )}
                {renderMainContent()}
            </main>
        </div>
    );
};

export default LearnGuide;