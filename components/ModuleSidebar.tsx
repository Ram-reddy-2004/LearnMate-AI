
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
    activeModule: string;
    onModuleChange: (moduleName: string) => void;
}

const ModuleSidebar: React.FC<ModuleSidebarProps> = ({ activeModule, onModuleChange }) => {
  return (
    <aside className="hidden md:flex flex-col w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4 space-y-4">
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
                    onModuleChange(mod.name);
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
  );
};

export default ModuleSidebar;
