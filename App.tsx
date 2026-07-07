import React, { useState } from "react";
import { Sparkles, RefreshCw, AlertCircle, HelpCircle, ArrowRight, UserPlus, FileSearch, Globe, ExternalLink } from "lucide-react";
import SourcingInput from "./components/SourcingInput";
import FilterChips from "./components/FilterChips";
import ResultCard from "./components/ResultCard";
import { SourcingCriteria, Candidate } from "./types";

export default function App() {
  const [selectedModel, setSelectedModel] = useState("gemini-3.5-flash");
  const [sourcingMode, setSourcingMode] = useState<"synthetic" | "grounded">("synthetic");
  const [criteria, setCriteria] = useState<SourcingCriteria | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isFallback, setIsFallback] = useState(false);
  const [parseFallback, setParseFallback] = useState(false);
  const [candidatesFallback, setCandidatesFallback] = useState(false);
  const [downgradedFromGrounded, setDowngradedFromGrounded] = useState(false);
  const [groundingMetadata, setGroundingMetadata] = useState<any>(null);
  
  // Sourcing loading indicators
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  // Track if criteria has been modified by the recruiter manually removing chips
  const [criteriaDirty, setCriteriaDirty] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Core search triggers both Parsing & Sourcing in sequence
  const handleFullSearch = async (query: string, hiringCriteria: string, model: string, mode: "synthetic" | "grounded" = "synthetic") => {
    setLoading(true);
    setParsing(true);
    setGenerating(false);
    setError(null);
    setSearchPerformed(true);
    setCriteriaDirty(false);
    setIsFallback(false);
    setParseFallback(false);
    setCandidatesFallback(false);
    setDowngradedFromGrounded(false);
    setGroundingMetadata(null);

    try {
      // Step 1: Query parser call
      const parseRes = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, hiringCriteria, model }),
      });

      if (!parseRes.ok) {
        const errData = await parseRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to parse natural language query into recruitment criteria.");
      }

      const parsedCriteria: SourcingCriteria & { parse_fallback?: boolean; is_fallback?: boolean } = await parseRes.json();
      if (parsedCriteria.parse_fallback || parsedCriteria.is_fallback) {
        setParseFallback(true);
        setIsFallback(true);
      }
      setCriteria(parsedCriteria);
      setParsing(false);
      setGenerating(true);

      // Step 2: Profiles synthesis call
      const candidatesRes = await fetch("/api/generate-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ criteria: parsedCriteria, model, sourcingMode: mode }),
      });

      if (!candidatesRes.ok) {
        const errData = await candidatesRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to synthesize matching talent profiles.");
      }

      const candidatesData = await candidatesRes.json();
      
      // Split fallbacks
      if (candidatesData.candidates_fallback || candidatesData.is_fallback) {
        setCandidatesFallback(true);
        setIsFallback(true);
        if (candidatesData.downgraded_from_grounded) {
          setDowngradedFromGrounded(true);
        }
      }

      // Log raw grounding metadata
      if (candidatesData.groundingMetadata) {
        console.log("%c[TalentOS Grounding Metadata]", "color: #10B981; font-weight: bold; font-size: 13px;", candidatesData.groundingMetadata);
        setGroundingMetadata(candidatesData.groundingMetadata);
      } else {
        setGroundingMetadata(null);
      }

      setCandidates(candidatesData.candidates || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during the sourcing workflow.");
    } finally {
      setParsing(false);
      setGenerating(false);
      setLoading(false);
    }
  };

  // Re-run profile generation only (useful when recruiter updates chips)
  const handleRegenerateProfiles = async () => {
    if (!criteria) return;
    setLoading(true);
    setGenerating(true);
    setError(null);
    setCriteriaDirty(false);
    setCandidatesFallback(false);
    setDowngradedFromGrounded(false);
    setGroundingMetadata(null);

    try {
      const candidatesRes = await fetch("/api/generate-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ criteria, model: selectedModel, sourcingMode }),
      });

      if (!candidatesRes.ok) {
        const errData = await candidatesRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to regenerate matching talent profiles.");
      }

      const candidatesData = await candidatesRes.json();
      
      if (candidatesData.candidates_fallback || candidatesData.is_fallback) {
        setCandidatesFallback(true);
        setIsFallback(true);
        if (candidatesData.downgraded_from_grounded) {
          setDowngradedFromGrounded(true);
        }
      }

      // Log raw grounding metadata
      if (candidatesData.groundingMetadata) {
        console.log("%c[TalentOS Grounding Metadata]", "color: #10B981; font-weight: bold; font-size: 13px;", candidatesData.groundingMetadata);
        setGroundingMetadata(candidatesData.groundingMetadata);
      } else {
        setGroundingMetadata(null);
      }

      setCandidates(candidatesData.candidates || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during profile synthesis.");
      setCriteriaDirty(true); // Retain dirty state on error so they can retry
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  };

  // Remove individual filter chip and mark criteria as modified/dirty
  const handleRemoveChip = (category: keyof SourcingCriteria, valueToRemove?: string) => {
    if (!criteria) return;
    const updated = { ...criteria };

    if (Array.isArray(updated[category])) {
      updated[category] = (updated[category] as string[]).filter(v => v !== valueToRemove) as any;
    } else {
      updated[category] = "" as any;
    }

    setCriteria(updated);
    setCriteriaDirty(true);
  };

  const handleClearAll = () => {
    setCriteria(null);
    setCandidates([]);
    setCriteriaDirty(false);
    setSearchPerformed(false);
    setError(null);
    setIsFallback(false);
    setParseFallback(false);
    setCandidatesFallback(false);
    setDowngradedFromGrounded(false);
    setGroundingMetadata(null);
  };

  return (
    <div id="app-root-container" className="min-h-screen bg-[#07090e] text-gray-200 selection:bg-[#00F0FF]/30 selection:text-[#00F0FF] relative overflow-hidden font-sans pb-24">
      {/* Decorative ambient visual effects (Soft-club neon vibes) */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#00F0FF]/[0.02] rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-[#0072FF]/[0.02] rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute top-[30%] left-[20%] w-[300px] h-[300px] bg-[#8A2387]/[0.01] rounded-full blur-[90px] pointer-events-none -z-10" />

      {/* Cyber Grid background element */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none -z-10 opacity-75" />

      <main className="max-w-5xl mx-auto px-4 py-12 md:py-16 space-y-8 relative">
        
        {/* Navigation / Header Brand Bar */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-sm tracking-wider text-white">
              TALENT<span className="text-[#00F0FF]">OS</span>
            </span>
            <span className="text-[9px] font-mono border border-white/10 px-1.5 py-0.5 rounded-md text-gray-500 uppercase">Prototype v2</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
            <span>Server-side API Sourcing Enabled</span>
          </div>
        </div>

        {/* Input Panel */}
        <SourcingInput
          onSearch={handleFullSearch}
          loading={loading}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          sourcingMode={sourcingMode}
          setSourcingMode={setSourcingMode}
        />

        {/* Grounded Downgrade Alert - Detailed Granular Sourcing Notification */}
        {downgradedFromGrounded && (
          <div id="grounded-downgrade-notification" className="p-5 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 flex gap-4 items-start animate-fadeIn shadow-[0_0_20px_rgba(245,158,11,0.15)]">
            <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 flex-shrink-0 animate-pulse">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2 flex-wrap">
                <span>⚠️ Grounded Search Failed → Downgraded to Synthetic Sandbox</span>
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">QUOTA RESILIENT</span>
              </h4>
              <p className="text-xs text-gray-200 leading-relaxed mt-1">
                Gemini's heavy Google Search Grounding mode hit API rate-limits or quota restrictions. To prevent blocking your workspace flow, TalentOS has automatically <strong className="text-amber-300">downgraded to synthetic mockup sandbox drafting</strong>. The profiles shown below are highly realistic synthetic drafts with automated LinkedIn X-Ray query links, rather than real-world search matches.
              </p>
            </div>
          </div>
        )}

        {/* Resilient Local Sourcing Fallback Status */}
        {isFallback && !downgradedFromGrounded && (
          <div id="fallback-notification" className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 flex gap-3 items-start animate-fadeIn">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2 flex-wrap">
                <span>{parseFallback ? "Resilient Local Parser Active" : "Resilient Local Match Active"}</span>
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/20">RATE LIMIT SHIELDED</span>
              </h4>
              <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                {parseFallback 
                  ? "We encountered a momentary Gemini API restriction while parsing your query. TalentOS has seamless offline parser mapping active so you can continue searching!"
                  : "We detected a momentary Gemini API quota limit. TalentOS has automatically activated offline local match synthesis so you can continue searching, editing filters, and launching x-ray sourcing lookups uninterrupted!"}
              </p>
            </div>
          </div>
        )}

        {/* Error Handling State */}
        {error && (
          <div id="error-alert-box" className="p-4 rounded-xl bg-red-950/20 border border-red-500/30 flex gap-3 items-start animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs font-mono font-bold text-red-300 uppercase tracking-wider">Search Pipeline Exception</h4>
              <p className="text-xs text-red-200 mt-1">{error}</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={criteriaDirty ? handleRegenerateProfiles : () => {}}
                  className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/20 text-xs text-red-200 hover:bg-red-500/25 transition-all cursor-pointer"
                >
                  Retry Sourcing Execution
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic Interactive Criteria Section */}
        {criteria && (
          <FilterChips
            criteria={criteria}
            onRemoveChip={handleRemoveChip}
            onClearAll={handleClearAll}
          />
        )}

        {/* Criteria Dirty Alert (If user deleted chips but hasn't updated profiles yet) */}
        {criteriaDirty && !loading && (
          <div id="criteria-dirty-banner" className="p-4 rounded-xl bg-[#00F0FF]/[0.02] border border-[#00F0FF]/20 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#00F0FF]" />
              <p className="text-xs text-gray-300">
                You modified the sourcing filters. Update the matching profiles to sync results with current chips.
              </p>
            </div>
            <button
              onClick={handleRegenerateProfiles}
              className="flex items-center gap-1.5 text-xs text-black bg-[#00F0FF] hover:bg-[#00F0FF]/80 px-4 py-2 rounded-lg font-medium transition-all cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.2)] active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Regenerate Matches</span>
            </button>
          </div>
        )}

        {/* Sourcing Progress States */}
        {loading && (
          <div id="sourcing-progress-indicator" className="space-y-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-2 border-[#00F0FF]/10 border-t-[#00F0FF] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#00F0FF] animate-pulse" />
                </div>
              </div>
              <h3 className="text-sm font-mono uppercase tracking-widest text-white mt-6">
                {parsing ? "Parsing Recruiter Intention..." : sourcingMode === "grounded" ? "Searching Live Web Directories..." : "Synthesizing Scarcity Talent..."}
              </h3>
              <p className="text-xs text-gray-500 mt-2 max-w-sm">
                {parsing
                  ? `Analyzing the query using ${selectedModel} to generate structured constraints and technological filters.`
                  : sourcingMode === "grounded"
                  ? "Sourcing, validating, and extracting real public profiles and academic/professional links matching your parameters."
                  : "Molding 6-8 synthetic candidate blueprints fitting your custom skills, location, and seniority vectors."}
              </p>
            </div>

            {/* Skeleton Loading Grids */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-40">
              {[1, 2, 3, 4].map((skeletonId) => (
                <div key={skeletonId} className="border border-white/5 bg-[#11141b]/30 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/5 animate-pulse" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-1/3 bg-white/10 rounded animate-pulse" />
                      <div className="h-3 w-1/2 bg-white/5 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="space-y-2 pt-4 border-t border-white/5">
                    <div className="h-3 w-full bg-white/5 rounded animate-pulse" />
                    <div className="h-3 w-5/6 bg-white/5 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profiles Results Section */}
        {!loading && searchPerformed && (
          <div id="results-profiles-grid" className="space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-lg text-white">
                  {sourcingMode === "grounded" ? "Live Grounded Search Results" : "Synthesized Sourcing Results"}
                </h2>
                <span className={`text-xs font-mono px-2 py-0.5 rounded-full bg-white/5 border text-gray-400 ${sourcingMode === "grounded" ? "border-emerald-500/20 text-emerald-400" : "border-white/10"}`}>
                  {candidates.length} Profiles
                </span>
              </div>
              <p className="text-[10px] text-gray-500 font-mono">
                {sourcingMode === "grounded" ? "Verified Public Web Profiles" : "Illustrative Mock Candidates"}
              </p>
            </div>

            {/* Grounding Engine Metadata Insights */}
            {groundingMetadata && (
              <div id="grounding-insights-panel" className="p-5 rounded-xl bg-emerald-500/5 border border-emerald-500/15 space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-500/10 pb-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <h3 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                      Real-Time Grounding Engine Insights
                    </h3>
                  </div>
                  <span className="text-[9px] font-mono text-emerald-500/60 uppercase">Gemini Web-Citations Info</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Executed Queries */}
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400 block mb-2">
                      Executed Search Queries
                    </span>
                    {groundingMetadata.webSearchQueries && groundingMetadata.webSearchQueries.length > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        {groundingMetadata.webSearchQueries.map((queryText: string, qi: number) => (
                          <div key={qi} className="text-xs font-mono text-emerald-300/90 bg-emerald-500/[0.04] border border-emerald-500/10 px-3 py-1.5 rounded-lg flex items-center gap-2">
                            <span className="text-[9px] text-emerald-500/50">#0{qi+1}</span>
                            <span>"{queryText}"</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic">No direct queries executed.</p>
                    )}
                  </div>

                  {/* Grounded Source Citations */}
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400 block mb-2">
                      Cited Web Sources ({groundingMetadata.groundingChunks?.length || 0})
                    </span>
                    {groundingMetadata.groundingChunks && groundingMetadata.groundingChunks.length > 0 ? (
                      <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto pr-1 scrollbar">
                        {groundingMetadata.groundingChunks.map((chunk: any, ci: number) => {
                          const title = chunk.web?.title || "Cited Web Document";
                          const uri = chunk.web?.uri;
                          if (!uri) return null;
                          return (
                            <a
                              key={ci}
                              href={uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-gray-300 bg-white/[0.02] border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/[0.02] px-3 py-2 rounded-lg flex items-center justify-between gap-2 group transition-all"
                            >
                              <div className="truncate flex-1">
                                <span className="text-[9px] font-mono text-emerald-400/70 mr-1.5 font-bold">[{ci+1}]</span>
                                <span className="group-hover:text-emerald-300 font-sans">{title}</span>
                                <span className="block text-[10px] text-gray-500 truncate mt-0.5">{uri}</span>
                              </div>
                              <ExternalLink className="w-3 h-3 text-gray-500 group-hover:text-emerald-400 flex-shrink-0" />
                            </a>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic">No web citations captured.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {candidates.length === 0 ? (
              <div className="text-center py-16 border border-white/5 rounded-2xl bg-[#11141b]/20">
                <FileSearch className="w-8 h-8 text-gray-600 mx-auto" />
                <h4 className="text-sm font-display font-medium text-gray-400 mt-4">No Matching Talent Synthesized</h4>
                <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                  Try refining your query, adjusting filters, or selecting the Pro reasoning engine to broaden or tighten matching logic.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {candidates.map((candidate, idx) => (
                  <ResultCard key={`${candidate.name}-${idx}`} candidate={candidate} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State / Welcome Splash when search has not run yet */}
        {!searchPerformed && !loading && (
          <div id="welcome-sourcing-splash" className="rounded-2xl bg-[#11141b]/20 border border-white/5 p-8 text-center space-y-6">
            <div className="w-12 h-12 rounded-full bg-[#00F0FF]/5 border border-[#00F0FF]/15 flex items-center justify-center mx-auto text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.08)]">
              <Sparkles className="w-5 h-5 fill-[#00F0FF]/10" />
            </div>
            
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="font-display font-semibold text-base text-gray-100">Intelligent Recruiter Workspace</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Provide natural language queries describing target PhD/scarcity profiles or system infrastructure hires. The system parses them into precise recruitment filters and populates interactive matching candidates.
              </p>
            </div>

            {/* Quick Sourcing Instructions / Value-prop block */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 max-w-3xl mx-auto border-t border-white/5 text-left text-xs">
              <div className="p-4 rounded-xl bg-[#11141b]/40 border border-white/5 space-y-1">
                <div className="text-[#00F0FF] font-mono font-bold text-[10px] uppercase">1. Intent Parse</div>
                <p className="text-gray-400 text-[11px]">Gemini identifies role title, seniority, locations, must-have skills, and academic pipelines.</p>
              </div>
              <div className="p-4 rounded-xl bg-[#11141b]/40 border border-white/5 space-y-1">
                <div className="text-[#00F0FF] font-mono font-bold text-[10px] uppercase">2. Tuning & Filters</div>
                <p className="text-gray-400 text-[11px]">Remove specific chips or edit constraints manually. Results and criteria sync seamlessly.</p>
              </div>
              <div className="p-4 rounded-xl bg-[#11141b]/40 border border-white/5 space-y-1">
                <div className="text-[#00F0FF] font-mono font-bold text-[10px] uppercase">3. Synthesis</div>
                <p className="text-gray-400 text-[11px]">Produces clearly-fictional but highly realistic candidate profiles with tailored AI match summaries.</p>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
