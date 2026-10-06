import React from "react";
import { Cpu, ChevronDown } from "lucide-react";

interface ModelOption {
  id: string;
  name: string;
  description: string;
}

const MODELS: ModelOption[] = [
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    description: "ultra-fast response time, perfect for quick iterations"
  },
  {
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro",
    description: "deep, advanced reasoning for complex academic/technical queries"
  }
];

interface ModelSelectorProps {
  selectedModel: string;
  onChange: (modelId: string) => void;
}

export default function ModelSelector({ selectedModel, onChange }: ModelSelectorProps) {
  const currentModel = MODELS.find(m => m.id === selectedModel) || MODELS[0];

  return (
    <div id="model-selector-container" className="relative inline-block text-left">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-[#00B4D8] font-mono font-bold">engine</span>
        <div className="relative">
          <select
            id="model-select"
            value={selectedModel}
            onChange={(e) => onChange(e.target.value)}
            className="appearance-none bg-white/80 text-xs font-mono font-bold text-ink pl-8 pr-10 py-2 rounded-full border border-ink/10 hover:border-[#00B4D8]/60 focus:border-[#00B4D8] focus:outline-none focus:ring-2 focus:ring-[#00B4D8]/20 transition-all cursor-pointer"
          >
            {MODELS.map((model) => (
              <option key={model.id} value={model.id} className="bg-white text-ink">
                {model.name} {model.id === "gemini-3.5-flash" ? "— fast" : "— deep"}
              </option>
            ))}
          </select>
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#04748c] pointer-events-none">
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
      <p className="text-[10px] text-right text-muted mt-1 font-mono lowercase">
        {currentModel.description}
      </p>
    </div>
  );
}
