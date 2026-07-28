import React from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import { ArrowLeft, Sparkles } from 'lucide-react';

interface ComingSoonPageProps {
  title: string;
  description: string;
  icon?: string;
}

export const ComingSoonPage: React.FC<ComingSoonPageProps> = ({
  title,
  description,
  icon = '✨',
}) => {
  return (
    <div className="min-h-screen font-sans flex bg-[#F0F4F7] text-[#1E3A4A]">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 pt-14 md:pt-0 min-h-screen flex flex-col overflow-y-auto bg-[#F0F4F7]">
        <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center items-center text-center my-auto">
          <div className="w-full p-8 sm:p-12 rounded-2xl bg-white border border-[#E5E7EB] flex flex-col items-center gap-6 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-[#2E7C87]/10 border border-[#2E7C87]/20 flex items-center justify-center text-3xl shrink-0">
              {icon}
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#2E7C87] bg-[#2E7C87]/10 px-3 py-1 rounded-full border border-[#2E7C87]/20 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                <span>Feature Coming Soon</span>
              </span>
              <h1 className="font-sans text-2xl sm:text-3xl font-semibold text-[#1E3A4A] mt-3">
                {title}
              </h1>
              <p className="text-xs sm:text-sm text-[#6B7B85] max-w-md mx-auto mt-2 leading-relaxed font-normal">
                {description}
              </p>
            </div>

            <Link to="/dashboard" className="no-underline mt-2">
              <button
                type="button"
                className="px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-[#2E7C87] hover:bg-[#256770] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Dashboard</span>
              </button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ComingSoonPage;
