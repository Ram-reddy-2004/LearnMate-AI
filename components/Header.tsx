import React from 'react';
import { BookOpenIcon, MenuIcon, LogOutIcon } from './Icons';
import { UserData } from '../types';

interface HeaderProps {
  onMenuClick: () => void;
  userData: UserData | null;
  onSignOut: () => void;
}

const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName || !lastName) return 'AI';
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, userData, onSignOut }) => {
  return (
    <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
      <div className="flex items-center space-x-3">
        <button onClick={onMenuClick} className="p-1 text-gray-700 dark:text-gray-300 md:hidden" aria-label="Open sidebar">
          <MenuIcon className="h-6 w-6" />
        </button>
        <div className="hidden sm:flex items-center space-x-3">
          <BookOpenIcon className="h-8 w-8 text-blue-500" />
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">
            LearnMate AI
          </h1>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-lg">
            {getInitials(userData?.firstName, userData?.lastName)}
        </div>
         <button onClick={onSignOut} className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full" aria-label="Sign out">
            <LogOutIcon className="h-6 w-6" />
         </button>
      </div>
    </header>
  );
};

export default Header;