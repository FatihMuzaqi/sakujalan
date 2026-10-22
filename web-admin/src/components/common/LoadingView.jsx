import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingView = ({ message = 'Memuat data sistem...', fullHeight = false }) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 p-8 ${fullHeight ? 'min-h-[60vh]' : 'py-12'}`}>
      <div className="relative">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  );
};

export default LoadingView;
