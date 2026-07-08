import React, { useState } from "react";
import { Search, ChevronDown, ChevronUp, Sliders, CornerDownLeft, Globe } from "lucide-react";
import ModelSelector from "./ModelSelector";

interface SourcingInputProps {
  onSearch: (query: string, criteria: string, model: string) => void;
  loading: boolean;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

const EXAMPLE_QUERIES = [
  {
    label: "PhD ML researchers, Toronto",
    query: "PhD machine learning researchers in Toronto with publications in NeurIPS/ICML and expertise in LLM fine-tuning",
    criteria: "PhD or Post-doc degree required. Experience with PyTorch, Transformer architectures, and parallel training."
  },
  {
    label: "Senior backend, fintech, remote",
    query: "Senior backend engineers in Canada or US remote with extensive Golang and high-throughput transactional systems experience",
    criteria: "Minimum 7+ years of experience. Experience with Kafka, PostgreSQL, microservices, and PCI compliance is preferred."
  },
  {
    label: "PhD Distributed Systems, RDMA/RoCEv2",
    query: "PhDs in distributed database internals from University of Waterloo with 5+ years of experience and deep RDMA/RoCEv2 background",
    criteria: "PhD in distributed systems or computer networks. Sourcing from top academic pipelines or enterprise research labs."
  },
  {
    label: "RL Agentic Systems, Montreal/UofT",
    query: "Deep learning engineers or researchers specializing in RL-led agentic systems, graduated from Montreal (MILA) or University of Toronto",
    criteria: "Must have hands-on experience building autonomous agent frameworks, multi-agent coordination, and custom environment modeling."
  }
];

export default function SourcingInput({
  onSearch,
  loading,
  selectedModel,
  setSelectedModel,
}: SourcingInputProps) {
  const [query, setQuery] = useState("");
  const [hiringCriteria, setHiringCriteria] = useState("");
  const [showExtraCriteria, setShowExtraCriteria] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;
    onSearch(query.trim(), hiringCriteria.trim(), selectedModel);
  };

  const handleExampleClick = (example: typeof EXAMPLE_QUERIES[0]) => {
    setQuery(example.query);
    setHiringCriteria(example.criteria);
    setShowExtraCriteria(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without shift key)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (query.trim() && !loading) {
        onSearch(query.trim(), hiringCriteria.trim(), selectedModel);
      }
    }
  };

  return (
    <div id="sourcing-input-card" className="relative rounded-2xl bg-[#11141b]/55 border border-white/10 p-6 md:p-8 backdrop-blur-md shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
      {/* Background glow behind search */}
      <div className="absolute -top-12 -left-12 w-48 h-48 bg-[#00F0FF]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top row with Title/Engine Selector */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)] bg-emerald-400" />
            <span className="text-[10px] uppercase tracking-widest font-mono text-gray-400">
              Sourcing Channel: <span className="text-emerald-400">Live Multi-Source Search</span>
            </span>
          </div>
          <h1 className="font-display font-bold text-2xl md:text-3xl text-white mt-1 tracking-tight">
            TalentOS <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F0FF] to-[#0072FF]">Search</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1 font-sans">
            Describe who you're looking for. Every search runs real, live queries across LinkedIn, academic sources (Scholar/arXiv), and GitHub.
          </p>
        </div>
        <div className="self-end sm:self-start">
          <ModelSelector selectedModel={selectedModel} onChange={setSelectedModel} />
        </div>
      </div>

      {/* Live grounding notice (replaces the old mode switcher) */}
      <div className="mb-6 flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
        <Globe className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <div className="text-xs text-gray-400 font-sans">
          Runs <strong className="text-emerald-400">real, live searches across LinkedIn, academic sources (Google Scholar / arXiv / Semantic Scholar), and GitHub</strong> in parallel to find real experts, public profiles, and live web source links. No mock/sandbox data is generated.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Main Query Textarea */}
        <div className="relative">
          <textarea
            id="search-query-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe specific real profiles, papers, or researchers (e.g. distributed systems professors at Waterloo, co-authors of RDMA/RoCEv2 protocols)"
            disabled={loading}
            rows={3}
            className="w-full bg-[#0e1015]/85 text-sm text-gray-100 placeholder-gray-500 rounded-xl border border-white/10 focus:border-[#00F0FF] focus:outline-none focus:ring-1 focus:ring-[#00F0FF]/30 p-4 pr-12 transition-all font-sans resize-none scrollbar"
          />
          <div className="absolute right-4 bottom-4 text-gray-500 flex items-center gap-1.5 pointer-events-none hidden md:flex font-mono text-[9px]">
            <span>Press Enter</span>
            <CornerDownLeft className="w-3 h-3" />
          </div>
          <div className="absolute right-4 top-4 text-gray-500">
            <Search className={`w-4.5 h-4.5 ${query.trim() ? "text-emerald-400" : "text-gray-600"} transition-colors`} />
          </div>
        </div>

        {/* Example Queries Row */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">Suggested Sourcing Focuses</span>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((example, i) => (
              <button
                key={i}
                type="button"
                disabled={loading}
                onClick={() => handleExampleClick(example)}
                className="text-[11px] px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-gray-300 hover:text-[#00F0FF] hover:border-[#00F0FF]/30 hover:bg-[#00F0FF]/5 transition-all duration-200 cursor-pointer text-left font-sans"
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>

        {/* Collapsible Extra Criteria */}
        <div className="border-t border-white/5 pt-4">
          <button
            type="button"
            disabled={loading}
            onClick={() => setShowExtraCriteria(!showExtraCriteria)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#00F0FF] transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Additional Hiring Criteria</span>
            {showExtraCriteria ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showExtraCriteria && (
            <div className="mt-3">
              <textarea
                id="extra-criteria-input"
                value={hiringCriteria}
                onChange={(e) => setHiringCriteria(e.target.value)}
                placeholder="Must-have technology stack, seniority specifics, university pipelines, target competitor companies, or other sourcing directives..."
                disabled={loading}
                rows={2}
                className="w-full bg-[#0e1015]/60 text-xs text-gray-200 placeholder-gray-500 rounded-lg border border-white/5 focus:border-[#00F0FF] focus:outline-none focus:ring-1 focus:ring-[#00F0FF]/20 p-3 transition-all font-sans resize-none"
              />
            </div>
          )}
        </div>

        {/* Submit Primary Sourcing Button */}
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className={`w-full py-3 px-4 rounded-xl font-display font-medium text-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 ${
            loading
              ? "bg-emerald-500/10 text-emerald-400/50 border border-emerald-500/10 cursor-not-allowed"
              : !query.trim()
              ? "bg-white/5 text-gray-500 border border-white/5 cursor-not-allowed"
              : "bg-gradient-to-r from-emerald-400 to-teal-500 text-black hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:brightness-110 active:scale-[0.99]"
          }`}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin border-emerald-400" />
              <span>Searching LinkedIn, Academic & GitHub Sources & Extracting Profiles...</span>
            </>
          ) : (
            <>
              <Globe className="w-4 h-4" />
              <span>Perform Live Sourcing Search</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
