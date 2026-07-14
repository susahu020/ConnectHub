'use client';

import React, { createContext, useContext, useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolveRef, setResolveRef] = useState<((value: boolean) => void) | null>(null);

  const confirm = (opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts);
      setIsOpen(true);
      setResolveRef(() => resolve);
    });
  };

  const handleClose = (value: boolean) => {
    setIsOpen(false);
    if (resolveRef) {
      resolveRef(value);
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && options && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-xs animate-fade-in p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl w-full max-w-sm space-y-4 shadow-2xl relative animate-scale-up">
            <button 
              onClick={() => handleClose(false)} 
              className="absolute right-4 top-4 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-all"
            >
              <X className="h-4 w-4" />
            </button>
            
            <div className="flex items-start space-x-3.5 pt-1">
              <div className={`p-2.5 rounded-2xl shrink-0 ${
                options.type === 'danger' 
                  ? 'bg-red-500/10 text-red-500' 
                  : options.type === 'warning'
                    ? 'bg-amber-500/10 text-amber-500'
                    : 'bg-primary/10 text-primary'
              }`}>
                <AlertCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {options.title || 'Are you sure?'}
                </h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed pr-2">
                  {options.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => handleClose(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl border hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-650 dark:text-slate-350"
              >
                {options.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => handleClose(true)}
                className={`px-4 py-2 text-xs font-bold rounded-xl text-white shadow-md transition-all ${
                  options.type === 'danger'
                    ? 'bg-red-500 hover:bg-red-600 shadow-red-500/10'
                    : options.type === 'warning'
                      ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/10'
                      : 'bg-primary hover:bg-primary/95 shadow-primary/10'
                }`}
              >
                {options.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context.confirm;
}
