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
    description: "Ultra-fast response time, perfect for quick iterations"
  },
  {
    id: "gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro",
    description: "Deep, advanced reasoning for complex academic/technical queries"
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
        <span className="text-[10px] uppercase tracking-widest text-[#00F0FF]/60 font-mono">Engine</span>
        <div className="relative">
          <select
            id="model-select"
            value={selectedModel}
            onChange={(e) => onChange(e.target.value)}
            className="appearance-none bg-[#11141b]/80 text-xs font-mono text-gray-200 pl-8 pr-10 py-1.5 rounded-lg border border-white/10 hover:border-[#00F0FF]/50 focus:border-[#00F0FF] focus:outline-none focus:ring-1 focus:ring-[#00F0FF]/30 transition-all cursor-pointer backdrop-blur-md"
          >
            {MODELS.map((model) => (
              <option key={model.id} value={model.id} className="bg-[#0e1117] text-gray-300">
                {model.name} {model.id === "gemini-3.5-flash" ? "— fast" : "— deep"}
              </option>
            ))}
          </select>
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#00F0FF]/80 pointer-events-none">
            <Cpu className="w-3.5 h-3.5" />
          </div>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <ChevronDown className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
      <p className="text-[10px] text-right text-gray-500 mt-1 font-sans">
        {currentModel.description}
      </p>
    </div>
  );
}
