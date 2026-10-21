import React, { useState, useRef, useEffect } from 'react';
import { Bot, ChevronDown, Check, Key, ExternalLink } from 'lucide-react';
import { ProviderModel } from '../../services/providers/types';

interface ComposerModelSelectorProps {
  isConfigured: boolean;
  selectedModel: string;
  availableModels: ProviderModel[];
  onSelectModel: (modelId: string) => void;
  onNavigateSettings?: () => void;
  direction?: 'up' | 'down';
}

/**
 * Compact, accessible model selector for message composers and headers.
 * Shows real active model from configured providers, eliminating unconfigured demo models.
 */
export const ComposerModelSelector: React.FC<ComposerModelSelectorProps> = ({
  isConfigured,
  selectedModel,
  availableModels,
  onSelectModel,
  onNavigateSettings,
  direction = 'up',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isConfigured) {
    return (
      <button
        type="button"
        onClick={onNavigateSettings}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F6F3F2] dark:bg-[#1A1D16] hover:bg-[#EAEBE4] dark:hover:bg-[#252B1E] text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] text-xs font-medium border border-[#E8E8E5] dark:border-[#2C3125] transition-colors cursor-pointer shrink-0"
        title="No API key active. Click to configure a provider key in Settings."
      >
        <Key className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        <span className="hidden sm:inline">Set API Key</span>
        <span className="sm:hidden">Key</span>
      </button>
    );
  }

  const activeModelObj = availableModels.find((m) => m.id === selectedModel);
  const displayName = activeModelObj?.name || selectedModel || 'Select Model';

  return (
    <div ref={containerRef} className="relative inline-block text-left shrink-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-full bg-[#F6F3F2] dark:bg-[#1A1D16] hover:bg-[#EAEBE4] dark:hover:bg-[#252B1E] text-[#191919] dark:text-[#ECEEE6] text-xs font-medium border border-[#E8E8E5] dark:border-[#2C3125] transition-colors cursor-pointer shadow-2xs"
        title={`Active Model: ${displayName} (Google Gemini)`}
      >
        <Bot className="w-3.5 h-3.5 text-[#416900] dark:text-[#B8F36B] shrink-0" />
        <span className="font-mono text-[11px] truncate max-w-[110px] sm:max-w-[160px]">
          {selectedModel || 'Select Model'}
        </span>
        <ChevronDown className="w-3 h-3 text-[#717171] dark:text-[#9EA396] shrink-0" />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 max-w-[calc(100vw-28px)] w-64 rounded-2xl bg-white dark:bg-[#161813] border border-[#E8E8E5] dark:border-[#282D22] shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100 ${
            direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          <div className="px-3 py-1.5 border-b border-[#E8E8E5]/60 dark:border-[#282D22] mb-1 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-[#717171] dark:text-[#9EA396] uppercase tracking-wider">
              Google Gemini (BYOK)
            </span>
            <span className="text-[10px] text-[#416900] dark:text-[#B8F36B] font-medium bg-[#E0E5D3] dark:bg-[#242C19] px-1.5 py-0.2 rounded">
              Active Key
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto space-y-0.5 px-1">
            {availableModels.map((model) => {
              const isSelected = selectedModel === model.id;
              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => {
                    onSelectModel(model.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 min-h-[40px] rounded-xl flex items-center justify-between text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#F1F2ED] dark:bg-[#22271D] text-[#191919] dark:text-[#ECEEE6] font-semibold'
                      : 'text-[#434938] dark:text-[#9EA396] hover:bg-[#F6F3F2] dark:hover:bg-[#1E221A]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] truncate">{model.name || model.id}</span>
                      {model.isRecommended && (
                        <span className="text-[9px] bg-[#B8F36B] text-[#102000] px-1.5 rounded font-medium">
                          Rec
                        </span>
                      )}
                    </div>
                    {model.description && (
                      <p className="text-[10px] text-[#717171] dark:text-[#9EA396] truncate pt-0.5">{model.description}</p>
                    )}
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#416900] dark:text-[#B8F36B] shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>

          <div className="pt-1.5 mt-1 border-t border-[#E8E8E5]/60 dark:border-[#282D22] px-2 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onNavigateSettings?.();
              }}
              className="text-[#717171] dark:text-[#9EA396] hover:text-[#191919] dark:hover:text-[#ECEEE6] flex items-center gap-1 cursor-pointer"
            >
              <span>Manage Keys in Settings</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
