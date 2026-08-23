import React from 'react';
import { Linkedin, Mail, X } from 'lucide-react';

interface AboutDeveloperProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutDeveloper = ({ isOpen, onClose }: AboutDeveloperProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] bg-slate-950 flex flex-col pt-[env(safe-area-inset-top)] overflow-y-auto p-6">
      <div className="flex justify-end p-2">
         <button 
             onClick={onClose} 
             className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white active:scale-95 transition-all"
             aria-label="Close Developer Info"
         >
             <X size={20} />
         </button>
      </div>

      <div className="p-6 bg-slate-900 rounded-2xl shadow-lg border border-slate-800">
        <h2 className="text-2xl font-bold mb-1">The Developer</h2>
        <p className="text-slate-400 mb-6">Independent Systems & Logistics Developer</p>
        
        <ul className="space-y-4 mb-8">
          <li className="flex gap-3">
            <span className="text-emerald-500 font-bold">•</span>
            <p className="text-slate-200 text-sm"><strong>Built from the Ground Up:</strong> Designed and coded independently to solve real-world friction and lags in high-volume warehouse environments.</p>
          </li>
          <li className="flex gap-3">
            <span className="text-emerald-500 font-bold">•</span>
            <p className="text-slate-200 text-sm"><strong>Performance Focused:</strong> Engineered with a custom, lightweight architecture to maximize operator picking speeds and preserve battery efficiency on mobile devices.</p>
          </li>
          <li className="flex gap-3">
            <span className="text-emerald-500 font-bold">•</span>
            <p className="text-slate-200 text-sm"><strong>Data-Driven:</strong> Integrated with secure, real-time cloud data pipelines and automated database maintenance to keep system stats immediate and accurate.</p>
          </li>
        </ul>
        
        <div className="flex gap-4">
          <a 
            href="https://www.linkedin.com/in/danielserghie" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg text-sm font-bold text-slate-200 hover:bg-slate-700"
          >
            <Linkedin size={16} /> View LinkedIn Profile
          </a>
          <a href="#" className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg text-sm font-bold text-slate-200 hover:bg-slate-700">
            <Mail size={16} /> Contact Support
          </a>
        </div>
      </div>
    </div>
  );
};