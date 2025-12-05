// Merkle DAG: components.table_of_contents
// Navigation component with section linking

interface Section {
  id: string;
  title: string;
  level: number;
}

interface TableOfContentsProps {
  sections: Section[];
}

export default function TableOfContents({ sections }: TableOfContentsProps) {
  return (
    <nav className="hidden md:block w-full sticky top-[calc(64px+env(safe-area-inset-top,0px)+16px)] self-start max-h-[calc(100vh-64px-env(safe-area-inset-top,0px)-32px)] overflow-y-auto">
      <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-xl p-5 shadow-sm border border-black/5 dark:border-white/10 w-full">
        <h3 className="text-[17px] font-semibold leading-[1.4] mb-4 text-gray-900 dark:text-gray-100 tracking-[-0.01em]">
          Table of Contents
        </h3>
        <ul className="flex flex-col list-none p-0 m-0">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className={`block text-[15px] leading-[1.5] text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 no-underline py-2 min-h-[44px] flex items-center ${
                  section.level === 1
                    ? 'font-semibold pl-0'
                    : section.level === 2
                    ? 'pl-4 text-sm'
                    : 'pl-8 text-sm'
                }`}
              >
                {section.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
