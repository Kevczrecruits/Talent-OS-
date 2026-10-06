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
    <div id="sourcing-input-card" className="relative rounded-3xl glass p-6 md:p-8">
      {/* Top row with Title/Engine Selector */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <div className="kicker">
            <span>sourcing channel · <span className="text-emerald-600">live multi-source search</span></span>
          </div>
          <h2 className="font-extrabold text-2xl md:text-3xl text-ink mt-2.5 tracking-tight lowercase">
            describe your <span className="text-[#00B4D8]">ideal hire</span>
          </h2>
          <p className="text-xs text-muted mt-1.5 font-mono leading-relaxed">
            describe who you're looking for — every search runs real, live queries across linkedin, academic sources, and github.
          </p>
        </div>
        <div className="self-end sm:self-start flex-shrink-0">
          <ModelSelector selectedModel={selectedModel} onChange={setSelectedModel} />
        </div>
      </div>

      {/* Live grounding notice (replaces the old mode switcher) */}
      <div className="mb-6 flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-500/[0.07] border border-emerald-500/20">
        <Globe className="w-4 h-4 text-emerald-600 flex-shrink-0" />
        <div className="text-xs text-ink/70">
          Runs <strong className="text-emerald-700">real, live searches across LinkedIn, academic sources (Google Scholar / arXiv / Semantic Scholar), and GitHub</strong> in parallel to find real experts, public profiles, and live web source links. No mock/sandbox data is generated.
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
            className="w-full bg-white/85 text-sm text-ink placeholder-muted/70 rounded-2xl border border-ink/10 focus:border-[#00B4D8] focus:outline-none focus:ring-2 focus:ring-[#00B4D8]/20 p-4 pr-12 transition-all font-sans resize-none"
          />
          <div className="absolute right-4 bottom-4 text-muted flex items-center gap-1.5 pointer-events-none hidden md:flex font-mono text-[9px]">
            <span>press enter</span>
            <CornerDownLeft className="w-3 h-3" />
          </div>
          <div className="absolute right-4 top-4 text-muted">
            <Search className={`w-4 h-4 ${query.trim() ? "text-emerald-600" : "text-muted/50"} transition-colors`} />
          </div>
        </div>

        {/* Example Queries Row */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase tracking-wider text-muted font-mono">suggested sourcing focuses</span>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((example, i) => (
              <button
                key={i}
                type="button"
                disabled={loading}
                onClick={() => handleExampleClick(example)}
                className="font-mono text-[11px] font-bold px-[18px] py-2 rounded-full bg-white/60 border border-ink/10 text-ink hover:text-[#04748c] hover:border-[#00B4D8]/50 hover:bg-white transition-all duration-200 cursor-pointer text-left"
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>

        {/* Collapsible Extra Criteria */}
        <div className="border-t border-ink/10 pt-4">
          <button
            type="button"
            disabled={loading}
            onClick={() => setShowExtraCriteria(!showExtraCriteria)}
            className="flex items-center gap-1.5 text-xs font-mono text-muted hover:text-[#04748c] transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>additional hiring criteria</span>
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
                className="w-full bg-white/70 text-xs text-ink placeholder-muted/70 rounded-2xl border border-ink/10 focus:border-[#00B4D8] focus:outline-none focus:ring-2 focus:ring-[#00B4D8]/20 p-3 transition-all font-sans resize-none"
              />
            </div>
          )}
        </div>

        {/* Submit Primary Sourcing Button */}
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className={`w-full py-3.5 px-4 rounded-full font-mono font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 ${
            loading
              ? "bg-ink/5 text-muted/60 border border-ink/10 cursor-not-allowed"
              : !query.trim()
              ? "bg-ink/5 text-muted/60 border border-ink/10 cursor-not-allowed"
              : "bg-ink text-white hover:bg-[#1a2233] hover:-translate-y-px active:scale-[0.99]"
          }`}
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin border-[#00B4D8]" />
              <span>searching linkedin, academic & github sources…</span>
            </>
          ) : (
            <>
              <Globe className="w-4 h-4" />
              <span>perform live sourcing search</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
