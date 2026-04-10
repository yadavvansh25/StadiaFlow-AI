"use client";

import { motion } from 'framer-motion';

interface AccessibilityToggleProps {
  enabled: boolean;
  onToggle: (state: boolean) => void;
}

export default function AccessibilityToggle({ enabled, onToggle }: AccessibilityToggleProps) {
  return (
    <div 
      className={`glass-panel p-6 flex flex-row items-center justify-between cursor-pointer transition-all duration-300 ${enabled ? 'bg-gradient-to-r from-blue-900/50 to-emerald-900/50 ring-2 ring-emerald-400' : 'opacity-80 hover:opacity-100'}`}
      onClick={() => onToggle(!enabled)}
    >
       <div>
         <h3 className="text-sm font-bold text-white mb-1">Accessibility Mode</h3>
         <p className="text-xs text-slate-300">
           {enabled ? 'Haptics ON • Step-free Active' : 'Step-free routing & haptics'}
         </p>
       </div>
       <div className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${enabled ? 'bg-emerald-500' : 'bg-slate-700'}`}>
         <motion.div 
           className="w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm"
           initial={false}
           animate={{
             left: enabled ? '1.5rem' : '0.25rem'
           }}
           transition={{ type: "spring", stiffness: 500, damping: 30 }}
         />
       </div>
    </div>
  );
}
