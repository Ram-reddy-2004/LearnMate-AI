
import React from 'react';
import { BookOpenIcon, BrainCircuitIcon, FlaskConicalIcon, LightbulbIcon, PencilRulerIcon, CompassIcon } from './Icons';

const modules = [
  { name: 'LearnVault', icon: <BrainCircuitIcon className="h-6 w-6" /> },
  { name: 'LearnGuide', icon: <CompassIcon className="h-6 w-6" /> },
  { name: 'SmartQuiz', icon: <PencilRulerIcon className="h-6 w-6" /> },
  { name: 'MyProgress', icon: <LightbulbIcon className="h-6 w-6" /> },
  { name: 'TestBuddy', icon: <FlaskConicalIcon className="h-6 w-6" /> },
  { name: 'SkillPath', icon: <BookOpenIcon className="h-6 w-6" /> },
];

interface ModuleSidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    activeModule: string;
    onModuleChange: (moduleName: string) => void;
}

const ModuleSidebar: React.FC<ModuleSidebarProps> = ({ isOpen, setIsOpen, activeModule, onModuleChange }) => {
  const handleModuleClick = (moduleName: string) => {
    onModuleChange(moduleName);
    if (window.innerWidth < 768) { // Only close on mobile
        setIsOpen(false);
    }
  };
    
  return (
    <>
        {/* Overlay for mobile */}
        <div 
            className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
        ></div>

        <aside className={`fixed top-0 left-0 z-40 h-screen w-[250px] bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4 space-y-4 flex flex-col transition-transform duration-300 ease-in-out
            ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
        >
            <div className="flex items-center space-x-2 mb-4">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Modules</h2>
            </div>
            <nav className="flex-1">
                <ul className="space-y-2">
                {modules.map((mod) => (
                    <li key={mod.name}>
                    <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            handleModuleClick(mod.name);
                        }}
                        className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                        mod.name === activeModule
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    >
                        {mod.icon}
                        <span className="font-medium">{mod.name}</span>
                    </a>
                    </li>
                ))}
                </ul>
            </nav>
        </aside>
    </>
  );
};

export default ModuleSidebar;
