
import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import ModuleSidebar from './components/ModuleSidebar';
import ChatWindow from './components/ChatWindow';
import PromptInput from './components/PromptInput';
import LearnVault from './components/LearnVault';
import SmartQuiz from './components/SmartQuiz';
import MyProgress from './components/MyProgress';
import TestBuddy from './components/TestBuddy';
import SkillPath from './components/SkillPath';
import LearnGuide from './components/LearnGuide';
import { type Message, Sender, type QuizResult } from './types';
import { generateContent } from './services/geminiService';

const MODULE_WELCOME_MESSAGES: Record<string, string> = {
  // All modules now have their own dedicated components.
};


const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<string>('LearnVault');
  const [learnVaultContent, setLearnVaultContent] = useState<string>('');
  const [quizHistory, setQuizHistory] = useState<QuizResult[]>([]);

  useEffect(() => {
    // Only set initial messages for modules that use the standard chat interface
    if (!['LearnVault', 'LearnGuide', 'SmartQuiz', 'MyProgress', 'TestBuddy', 'SkillPath'].includes(activeModule)) {
      const welcomeText = MODULE_WELCOME_MESSAGES[activeModule] || "Welcome! How can I help you today?";
      setMessages([
        {
          id: `initial-message-${activeModule}`,
          sender: Sender.AI,
          text: welcomeText,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [activeModule]);

  const handleSendMessage = useCallback(async (prompt: string, files: File[]) => {
    if (!prompt.trim() && files.length === 0) return;

    setIsLoading(true);
    setError(null);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: Sender.User,
      text: prompt,
      files: files.map(f => ({ name: f.name, type: f.type })),
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMessage]);

    try {
      const aiResponseText = await generateContent(prompt, files);
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        sender: Sender.AI,
        text: aiResponseText,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(errorMessage);
      const aiErrorMessage: Message = {
        id: `ai-error-${Date.now()}`,
        sender: Sender.AI,
        text: `Sorry, I encountered an error: ${errorMessage}`,
        isError: true,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiErrorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const handleModuleChange = (moduleName: string) => {
    setActiveModule(moduleName);
    setMessages([]);
    setError(null);
  }
  
  const handleVaultUpdate = useCallback((newContent: string) => {
    setLearnVaultContent(prev => `${prev}\n\n${newContent}`);
  }, []);

  const handleQuizCompletion = useCallback((result: { score: number; totalQuestions: number }) => {
    const newResult: QuizResult = {
      ...result,
      topic: "General Knowledge", // Simulate topic for now
      timestamp: new Date().toISOString(),
    };
    setQuizHistory(prev => [...prev, newResult]);
  }, []);

  const renderModuleContent = () => {
    switch (activeModule) {
      case 'LearnVault':
        return <LearnVault onContentProcessed={handleVaultUpdate} />;
      case 'LearnGuide':
        return <LearnGuide 
                  knowledgeBase={learnVaultContent} 
                  onNavigateToVault={() => handleModuleChange('LearnVault')} 
               />;
      case 'SmartQuiz':
        return <SmartQuiz 
                    learnVaultContent={learnVaultContent} 
                    onNavigateToVault={() => handleModuleChange('LearnVault')}
                    onQuizComplete={handleQuizCompletion}
                />;
      case 'MyProgress':
        return <MyProgress quizHistory={quizHistory} onNavigateToQuiz={() => handleModuleChange('SmartQuiz')} />;
      case 'TestBuddy':
        return <TestBuddy
                    learnVaultContent={learnVaultContent}
                    onNavigateToVault={() => handleModuleChange('LearnVault')}
                />;
      case 'SkillPath':
        return <SkillPath />;
      default:
        return <ChatWindow messages={messages} isLoading={isLoading} />;
    }
  };
  
  const showPromptInput = !['LearnVault', 'LearnGuide', 'SmartQuiz', 'MyProgress', 'TestBuddy', 'SkillPath'].includes(activeModule);

  return (
    <div className="flex h-screen w-full font-sans bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
      <ModuleSidebar activeModule={activeModule} onModuleChange={handleModuleChange} />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {renderModuleContent()}
        </main>
        {showPromptInput && (
          <footer className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
            {error && <p className="text-red-500 text-center text-sm mb-2">{error}</p>}
            <PromptInput onSubmit={handleSendMessage} isLoading={isLoading} />
          </footer>
        )}
      </div>
    </div>
  );
};

export default App;
