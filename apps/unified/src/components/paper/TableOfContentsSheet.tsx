// Merkle DAG: components.table_of_contents_sheet
// Collapsible sheet component for table of contents

import { useState, useEffect } from 'react';

interface Section {
  id: string;
  title: string;
  level: number;
}

interface Props {
  sections: Section[];
}

export default function TableOfContentsSheet({ sections }: Props) {
  // Desktop: open by default, Mobile: closed by default
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Set initial state based on screen size
    const checkScreenSize = () => {
      setIsOpen(window.innerWidth >= 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  return (
    <>
      {/* Sheet Trigger Button (Mobile) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-20 left-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 shadow-lg flex items-center justify-between text-gray-900 dark:text-gray-100 font-medium z-50"
        aria-label="Toggle Table of Contents"
      >
        <svg
          className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="ml-2">Table of Contents</span>
      </button>

      {/* Desktop Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="hidden md:flex fixed top-[calc(64px+env(safe-area-inset-top,0px)+16px)] left-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 shadow-lg items-center justify-center text-gray-900 dark:text-gray-100 font-medium z-50"
        aria-label="Toggle Table of Contents"
      >
        <svg
          className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
        </svg>
        {!isOpen && (
          <span className="ml-2 text-sm font-medium">TOC</span>
        )}
      </button>

      {/* Sheet Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sheet Content */}
      <div
        className={`
          fixed
          top-0
          left-0
          bottom-0
          bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl
          rounded-r-2xl
          shadow-2xl
          border-r
          border-black/5 dark:border-white/10
          w-[280px] md:w-[320px]
          h-full
          overflow-hidden
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          z-50
        `}
      >
        {/* Sheet Header */}
        <div className="flex items-center justify-between p-4 md:p-5 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-[17px] font-semibold leading-[1.4] text-gray-900 dark:text-gray-100 tracking-[-0.01em]">
            Table of Contents
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Sheet Body */}
        <div className="overflow-y-auto h-[calc(100%-64px)] p-4 md:p-5">
            <ul className="flex flex-col list-none p-0 m-0">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    onClick={() => {
                      // Close sheet on mobile when clicking a link
                      if (window.innerWidth < 768) {
                        setIsOpen(false);
                      }
                    }}
                    className={`
                      block text-[15px] leading-[1.5] 
                      text-gray-600 dark:text-gray-400 
                      hover:text-blue-600 dark:hover:text-blue-400 
                      transition-colors duration-200 
                      no-underline py-2 min-h-[44px] flex items-center
                      ${section.level === 1 
                        ? 'font-semibold pl-0' 
                        : section.level === 2 
                        ? 'pl-4 text-sm' 
                        : 'pl-8 text-sm'
                      }
                    `}
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
      </div>
    </>
  );
}

