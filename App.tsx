import React, { useState, useEffect, useCallback } from 'react';
// Fix: Remove unused 'signOut' import from Firebase v9.
import { auth } from './services/firebaseConfig';
import { useAuth } from './context/AuthContext';
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
import { AuthPage } from './components/AuthPage';
import { type Message, Sender, type McqResult, UserData } from './types';
import { generateContent } from './services/geminiService';
import { updateLearnVault, addMcqResult, updateUserOnSuccess } from './services/firebaseService';

const App: React.FC = () => {
  const { user, userData, isLoading: isAuthLoading } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<string>('MyProgress');
  
  // State is now driven by userData from Firestore
  const [learnVaultContent, setLearnVaultContent] = useState<string>('');
  const [mcqHistory, setMcqHistory] = useState<McqResult[]>([]);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (userData) {
      setLearnVaultContent(userData.learnVaultContent || '');
      setMcqHistory(userData.mcqHistory || []);
      setActiveModule('MyProgress'); // Default to progress page on login
    } else {
      // Reset state on logout
      setLearnVaultContent('');
      setMcqHistory([]);
    }
  }, [userData]);

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
  
  const handleVaultUpdate = useCallback(async (newContent: string) => {
    if (!user) return;
    const updatedContent = `${learnVaultContent}\n\n${newContent}`;
    setLearnVaultContent(updatedContent); // Optimistic UI update
    try {
      await updateLearnVault(user.uid, newContent, learnVaultContent);
    } catch (e) {
      console.error("Failed to update vault:", e);
      // Optionally revert state or show an error
    }
  }, [user, learnVaultContent]);

  const handleMcqCompletion = useCallback(async (result: { score: number; total: number; topic: string }) => {
    if (!user) return;
    const newResult: McqResult = {
      ...result,
      completedAt: new Date().toISOString(),
    };
    setMcqHistory(prev => [...prev, newResult]); // Optimistic UI update
    try {
      await addMcqResult(user.uid, newResult);
    } catch (e) {
      console.error("Failed to save quiz result:", e);
    }
  }, [user]);
  
  const handleCodingSuccess = useCallback(async () => {
    if (!user) return;
    // This function will just update the user's progress summary.
    // The detailed results are handled within TestBuddy.
    try {
        await updateUserOnSuccess(user.uid);
    } catch(e) {
        console.error("Failed to update user progress:", e);
    }
  }, [user]);


  const handleSignOut = async () => {
    try {
      // Fix: Use Firebase v8 namespaced method for signing out.
      await auth.signOut();
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  if (isAuthLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <svg className="animate-spin h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }
  
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
                    onQuizComplete={handleMcqCompletion}
                />;
      case 'MyProgress':
        return <MyProgress 
                    userData={userData}
                    mcqHistory={mcqHistory} 
                    onNavigateToQuiz={() => handleModuleChange('SmartQuiz')} 
               />;
      case 'TestBuddy':
        return <TestBuddy
                    learnVaultContent={learnVaultContent}
                    onNavigateToVault={() => handleModuleChange('LearnVault')}
                    onMcqComplete={handleMcqCompletion}
                    onCodingSuccess={handleCodingSuccess}
                />;
      case 'SkillPath':
        return <SkillPath />;
      default:
        return <ChatWindow messages={messages} isLoading={isLoading} />;
    }
  };
  
  const showPromptInput = !['LearnVault', 'LearnGuide', 'SmartQuiz', 'MyProgress', 'TestBuddy', 'SkillPath'].includes(activeModule);

  return (
    <div className="min-h-screen w-full font-sans bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 flex">
      <ModuleSidebar 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        activeModule={activeModule} 
        onModuleChange={handleModuleChange} 
      />
      <div className="flex flex-col flex-1 md:ml-[250px]">
        <Header 
          onMenuClick={() => setIsSidebarOpen(true)}
          userData={userData}
          onSignOut={handleSignOut}
        />
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