import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
// @ts-ignore
import API from '../api/axios';

export interface SearchResultItem {
  type: 'subject' | 'material' | 'chat';
  title: string;
  subtitle: string;
  subjectId: string;
  link: string;
}


export const GlobalSearch: React.FC<{ placeholder?: string; className?: string }> = ({
  placeholder = 'Search subjects, materials, chats...',
  className = 'w-64 md:w-80',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close overlay on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close overlay on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced search fetch
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    setIsOpen(true);

    const timer = setTimeout(async () => {
      try {
        const res = await API.get(`/subjects/search?q=${encodeURIComponent(query.trim())}`);
        setResults(res.data);
      } catch (err) {
        console.error('Failed to fetch search results', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectResult = (link: string) => {
    setIsOpen(false);
    setQuery('');
    navigate(link);
  };

  const subjectResults = results.filter((r) => r.type === 'subject');
  const materialResults = results.filter((r) => r.type === 'material');
  const chatResults = results.filter((r) => r.type === 'chat');

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <svg
          className="w-4 h-4 text-[#6B7B85] absolute left-3.5 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onFocus={() => {
            if (query.trim().length >= 2) setIsOpen(true);
          }}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-9 py-2 rounded-xl text-xs bg-white border border-[#E5E7EB] text-[#1E3A4A] placeholder-[#6B7B85] focus:outline-none focus:border-[#2E7C87] focus:ring-1 focus:ring-[#2E7C87] transition-colors"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-3 text-xs text-[#6B7B85] hover:text-[#1E3A4A] transition-colors cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Results Dropdown Overlay */}
      {isOpen && (
        <div
          className="absolute right-0 md:left-0 top-full mt-2 w-72 md:w-96 rounded-2xl bg-white border border-[#E5E7EB] shadow-2xl z-50 overflow-hidden max-h-[420px] overflow-y-auto p-2"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-[#6B7B85]">
              <svg className="animate-spin h-4 w-4 text-[#2E7C87]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Searching workspace...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#6B7B85]">
              No results found for &ldquo;<span className="text-[#1E3A4A] font-medium">{query}</span>&rdquo;
            </div>
          ) : (
            <div className="flex flex-col gap-3 p-1">
              {/* Subjects Group */}
              {subjectResults.length > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#2E7C87] flex items-center gap-1.5">
                    <span>📚</span>
                    <span>Subjects ({subjectResults.length})</span>
                  </div>
                  {subjectResults.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectResult(item.link)}
                      className="w-full text-left px-3 py-2 rounded-xl bg-[#F0F4F7]/70 hover:bg-[#F0F4F7] border border-transparent hover:border-[#2E7C87]/30 transition-all flex flex-col gap-0.5 cursor-pointer group"
                    >
                      <span className="text-xs font-semibold text-[#1E3A4A] group-hover:text-[#2E7C87] truncate">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-[#6B7B85] truncate">{item.subtitle}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Materials Group */}
              {materialResults.length > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#2E7C87] flex items-center gap-1.5">
                    <span>📄</span>
                    <span>Materials ({materialResults.length})</span>
                  </div>
                  {materialResults.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectResult(item.link)}
                      className="w-full text-left px-3 py-2 rounded-xl bg-[#F0F4F7]/70 hover:bg-[#F0F4F7] border border-transparent hover:border-[#2E7C87]/30 transition-all flex flex-col gap-0.5 cursor-pointer group"
                    >
                      <span className="text-xs font-semibold text-[#1E3A4A] group-hover:text-[#2E7C87] truncate">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-[#6B7B85] truncate">{item.subtitle}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Chat History Group */}
              {chatResults.length > 0 && (
                <div className="flex flex-col gap-1">
                  <div className="px-2 py-1 text-[10px] font-mono font-bold uppercase tracking-wider text-[#6B7B85] flex items-center gap-1.5">
                    <span>💬</span>
                    <span>Chat History ({chatResults.length})</span>
                  </div>
                  {chatResults.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectResult(item.link)}
                      className="w-full text-left px-3 py-2 rounded-xl bg-[#F0F4F7]/70 hover:bg-[#F0F4F7] border border-transparent hover:border-[#2E7C87]/30 transition-all flex flex-col gap-0.5 cursor-pointer group"
                    >
                      <span className="text-xs font-medium text-[#1E3A4A] group-hover:text-[#2E7C87] truncate">
                        &ldquo;{item.title}&rdquo;
                      </span>
                      <span className="text-[10px] text-[#6B7B85] truncate">{item.subtitle}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
