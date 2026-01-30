import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="border-b border-space-700 bg-black/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <div>
            <h1 className="text-2xl font-light tracking-[0.2em] text-white">VIGILANT-L</h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-8 text-[10px] font-mono tracking-widest text-space-400">
          <div className="flex flex-col items-end">
             <span className="mb-1">STATUS</span>
             <span className="text-white flex items-center gap-2">
               <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
               ONLINE
             </span>
          </div>
          <div className="flex flex-col items-end hidden sm:flex">
             <span className="mb-1">MISSION CLOCK</span>
             <span className="text-white">T+48:12:09</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;