import React from 'react';
import { BookOpenIcon } from './Icons';

const Header: React.FC = () => {
  return (
    <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
      <div className="flex items-center space-x-3">
        <BookOpenIcon className="h-8 w-8 text-blue-500" />
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">
          LearnMate AI
        </h1>
      </div>
      <div className="flex items-center space-x-4">
        <img src="https://picsum.photos/seed/user/40/40" alt="User Avatar" className="h-10 w-10 rounded-full" />
      </div>
    </header>
  );
};

export default Header;