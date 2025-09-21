import React, { useState, useEffect, useCallback } from 'react';
// Fix: Remove unused 'signOut' import from Firebase v9.
import { auth, db } from './services/firebaseConfig';
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
import { ModuleLoadingIndicator } from './components/LoadingIndicators';
import { type Message, Sender, UserData, QuizResult, TestResult } from './types';
import { generateContent } from './services/geminiService';
import { updateLearnVault, saveQuizResult, saveCodingResult } from './services/firebaseService';


const App: React.FC = () => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isUserDataLoading, setIsUserDataLoading] = useState(true);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<string>('MyProgress');
  
  const [learnVaultContent, setLearnVaultContent] = useState<string>('');
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  useEffect(() => {
    if (!user) {
        setUserData(null);
        setIsUserDataLoading(false);
        return;
    }

    setIsUserDataLoading(true);
    const userDocRef = db.collection('users').doc(user.uid);
    
    const unsubscribe = userDocRef.onSnapshot(
      (doc) => {
        if (doc.exists) {
          const data = doc.data() as any;
          const toISOString = (timestamp: any): string => {
            if (timestamp && typeof timestamp.toDate === 'function') {
              return timestamp.toDate().toISOString();
            }
            return new Date().toISOString(); // Fallback
          };
          
          setUserData({
            uid: doc.id,
            profile: data.profile,
            learnVaultContent: data.learnVaultContent,
            createdAt: toISOString(data.createdAt),
          } as UserData);
        } else {
          setUserData(null);
        }
        setIsUserDataLoading(false);
      },
      (err) => {
        console.error("Error fetching user data:", err);
        setUserData(null);
        setIsUserDataLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (userData) {
      setLearnVaultContent(userData.learnVaultContent || '');
      setActiveModule('MyProgress'); // Default to progress page on login
    } else {
      // Reset state on logout
      setLearnVaultContent('');
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

  const handleMcqCompletion = useCallback(async (result: Omit<QuizResult, 'quizId' | 'attemptedAt'>) => {
    if (!user) return;
    try {
      await saveQuizResult(user.uid, result);
    } catch (e) {
      console.error("Failed to save quiz result:", e);
    }
  }, [user]);
  
  const handleCodingAttempt = useCallback(async (result: Omit<TestResult, 'attemptedAt'>) => {
    if (!user) return;
    try {
        await saveCodingResult(user.uid, result);
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

  if (isAuthLoading || isUserDataLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <ModuleLoadingIndicator text="Loading LearnMate..." />
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
                    onNavigateToQuiz={() => handleModuleChange('SmartQuiz')}
                    onNavigateToTestBuddy={() => handleModuleChange('TestBuddy')}
               />;
      case 'TestBuddy':
        return <TestBuddy
                    learnVaultContent={learnVaultContent}
                    onNavigateToVault={() => handleModuleChange('LearnVault')}
                    onMcqComplete={handleMcqCompletion}
                    onCodingAttempt={handleCodingAttempt}
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