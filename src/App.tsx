import React, { useState, useRef } from "react";
import { Sparkles, RefreshCw, AlertCircle, ArrowRight, UserPlus, FileSearch, ExternalLink } from "lucide-react";
import SourcingInput from "./components/SourcingInput";
import FilterChips from "./components/FilterChips";
import ResultCard from "./components/ResultCard";
import PasscodeDialog from "./components/PasscodeDialog";
import { SourcingCriteria, Candidate } from "./types";

export default function App() {
  const [selectedModel, setSelectedModel] = useState("deepseek-flash");
  const [criteria, setCriteria] = useState<SourcingCriteria | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isFallback, setIsFallback] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [groundedSources, setGroundedSources] = useState<string[]>([]);
  const [searchEngine, setSearchEngine] = useState<"tavily" | "google" | "local">("local");

  // Sourcing loading indicators
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Track if criteria has been modified by the recruiter manually removing chips
  const [criteriaDirty, setCriteriaDirty] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Passcode gate — the search UI stays visible; only execution is locked.
  // The code is kept in sessionStorage and sent as the x-app-passcode header.
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem("talentos_pass") !== null;
    } catch {
      return false;
    }
  });
  const [passOpen, setPassOpen] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);
  const pendingSearch = useRef<{ query: string; hiringCriteria: string; model: string } | null>(null);

  const passHeaders = (): Record<string, string> => {
    try {
      return { "X-App-Passcode": sessionStorage.getItem("talentos_pass") || "" };
    } catch {
      return { "X-App-Passcode": "" };
    }
  };

  const handleUnauthorized = () => {
    try {
      sessionStorage.removeItem("talentos_pass");
    } catch {}
    pendingSearch.current = null;
    setUnlocked(false);
    setLoading(false);
    setParsing(false);
    setGenerating(false);
    setPassError("incorrect passcode — try again.");
    setPassOpen(true);
  };

  // Entry point from the search bar: lock check happens here so the
  // natural-language input stays fully visible while locked.
  const requestSearch = (query: string, hiringCriteria: string, model: string) => {
    if (!unlocked) {
      pendingSearch.current = { query, hiringCriteria, model };
      setPassError(null);
      setPassOpen(true);
      return;
    }
    runSearch(query, hiringCriteria, model);
  };

  const handlePassSubmit = (code: string) => {
    try {
      sessionStorage.setItem("talentos_pass", code);
    } catch {}
    setUnlocked(true);
    setPassOpen(false);
    setPassError(null);
    const p = pendingSearch.current;
    pendingSearch.current = null;
    if (p) runSearch(p.query, p.hiringCriteria, p.model);
  };

  // Core search triggers both Parsing & Sourcing in sequence
  const runSearch = async (query: string, hiringCriteria: string, model: string) => {
    setLoading(true);
    setParsing(true);
    setGenerating(false);
    setError(null);
    setSearchPerformed(true);
    setCriteriaDirty(false);
    setIsFallback(false);

    try {
      // Step 1: Query parser call
      const parseRes = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...passHeaders() },
        body: JSON.stringify({ query, hiringCriteria, model }),
      });

      if (parseRes.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!parseRes.ok) {
        const errData = await parseRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to parse natural language query into recruitment criteria.");
      }

      const parsedCriteria: SourcingCriteria & { is_fallback?: boolean } = await parseRes.json();
      if (parsedCriteria.is_fallback) {
        setIsFallback(true);
      }
      setCriteria(parsedCriteria);
      setParsing(false);
      setGenerating(true);

      // Step 2: Profiles synthesis call
      const candidatesRes = await fetch("/api/generate-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...passHeaders() },
        body: JSON.stringify({ criteria: parsedCriteria, model, sourcingMode: "grounded" }),
      });

      if (candidatesRes.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!candidatesRes.ok) {
        const errData = await candidatesRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to synthesize matching talent profiles.");
      }

      const candidatesData = await candidatesRes.json();
      setIsFallback(!!candidatesData.is_fallback);
      setFallbackReason(candidatesData.is_fallback ? (candidatesData.fallback_reason || "api_error") : null);
      setGroundedSources(candidatesData.grounded_sources || []);
      setSearchEngine(candidatesData.is_fallback ? "local" : (candidatesData.search_engine || "google"));
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

    try {
      const candidatesRes = await fetch("/api/generate-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...passHeaders() },
        body: JSON.stringify({ criteria, model: selectedModel, sourcingMode: "grounded" }),
      });

      if (candidatesRes.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!candidatesRes.ok) {
        const errData = await candidatesRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to regenerate matching talent profiles.");
      }

      const candidatesData = await candidatesRes.json();
      setIsFallback(!!candidatesData.is_fallback);
      setFallbackReason(candidatesData.is_fallback ? (candidatesData.fallback_reason || "api_error") : null);
      setGroundedSources(candidatesData.grounded_sources || []);
      setSearchEngine(candidatesData.is_fallback ? "local" : (candidatesData.search_engine || "google"));
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
  };

  return (
    <div id="app-root-container" className="min-h-screen text-ink selection:bg-[#00B4D8]/20 selection:text-ink relative font-sans pb-0">
      <div className="relative z-10">

        <main className="max-w-5xl mx-auto px-4 md:px-6 pt-4 pb-16 space-y-8">

          {/* Floating pill nav (tool-library style) */}
          <nav className="sticky top-3.5 z-50 glass rounded-full px-5 py-2.5 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <span className="font-display font-extrabold text-sm tracking-tight text-ink lowercase">
                talent<span className="text-[#00B4D8]">os</span>
              </span>
              <span className="text-[9px] font-mono border border-ink/15 px-1.5 py-0.5 rounded-md text-muted uppercase">prototype v2</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
              <span className="w-2 h-2 rounded-full bg-[#00B4D8] shadow-[0_0_10px_#00B4D8] animate-pulse" />
              <span>server-side api sourcing enabled</span>
            </div>
          </nav>

          {/* Hero (tool-library style) */}
          <header className="pt-6">
            <div className="kicker">kevin's sourcing stack · live search</div>
            <h1 className="font-extrabold tracking-tight lowercase leading-[0.98] text-[clamp(40px,6.5vw,72px)] mt-3">
              talent<span className="text-[#00B4D8]">os</span> search
            </h1>
            <p className="font-mono text-[13px] text-muted mt-3 max-w-xl leading-[1.7]">
              describe who you're looking for in plain language — every search runs real, live queries across linkedin, academic sources, and github.
            </p>
          </header>

          {/* Input Panel */}
          <SourcingInput
            onSearch={requestSearch}
            loading={loading}
            locked={!unlocked}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
          />

          <PasscodeDialog
            open={passOpen}
            error={passError}
            onSubmit={handlePassSubmit}
            onClose={() => setPassOpen(false)}
          />

          {/* Resilient Local Sourcing Fallback Status */}
          {isFallback && (
            <div id="fallback-notification" className="p-5 rounded-3xl glass border-amber-500/30! flex gap-3 items-start">
              <div className="p-1.5 rounded-xl bg-amber-500/15 text-amber-600 flex-shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-mono font-bold text-amber-700 uppercase tracking-wider flex items-center gap-2 flex-wrap">
                  <span>local match active — not real results</span>
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 font-semibold border border-amber-500/30">
                    {fallbackReason === "rate_limit" ? "rate limit hit" : "llm api error"}
                  </span>
                </h4>
                <p className="text-xs text-ink/70 mt-1 leading-relaxed">
                  {fallbackReason === "rate_limit"
                    ? "Gemini's quota was exhausted for this request. These candidates are locally-generated placeholders, not real people or a real search."
                    : "The LLM API call failed (not a quota issue). These candidates are locally-generated placeholders, not real people or a real search."}
                </p>
              </div>
            </div>
          )}

          {/* Grounded search succeeded — show real citation count */}
          {!isFallback && groundedSources.length > 0 && (
            <div id="grounded-sources-notification" className="p-5 rounded-3xl glass border-[#00B4D8]/30! flex flex-col gap-3">
              <div className="flex gap-3 items-start">
                <div className="p-1.5 rounded-xl bg-[#00B4D8]/15 text-[#04748c] flex-shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-mono font-bold text-[#04748c] uppercase tracking-wider">
                    {searchEngine === "tavily"
                      ? `live sourced via linkedin, academic & github search — ${groundedSources.length} profile source${groundedSources.length === 1 ? "" : "s"} found`
                      : `live search verified via google grounding — ${groundedSources.length} source${groundedSources.length === 1 ? "" : "s"} found`}
                  </h4>
                  <p className="text-xs text-ink/70 mt-1 leading-relaxed">
                    {searchEngine === "tavily"
                      ? "These candidates were located in real-time from parallel web searches across LinkedIn, academic sources (Scholar/arXiv), and GitHub, then structured using Gemini. Still confirm each profile manually before outreach."
                      : "These candidates were reformatted from an actual Google Search grounding call. Still confirm each profile manually before outreach."}
                  </p>
                </div>
              </div>

              {/* Citation List */}
              <div className="mt-2 pt-3 border-t border-[#00B4D8]/15 space-y-1.5">
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#04748c] block">verified web references & citations:</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {groundedSources.map((source, index) => {
                    const colonIndex = source.indexOf(": http");
                    let name = source;
                    let url = "";
                    if (colonIndex !== -1) {
                      name = source.substring(0, colonIndex);
                      url = source.substring(colonIndex + 2);
                    } else if (source.startsWith("http")) {
                      name = source;
                      url = source;
                    }

                    // Clean up name a bit if it has trailing LinkedIn strings
                    if (name.length > 65) {
                      name = name.slice(0, 62) + "...";
                    }

                    return (
                      <div key={index} className="flex items-center gap-1.5 text-xs bg-white/70 border border-[#00B4D8]/15 hover:border-[#00B4D8]/40 px-2.5 py-1.5 rounded-xl truncate">
                        <span className="text-[#04748c] font-mono text-[10px] flex-shrink-0">[{index + 1}]</span>
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-ink/80 hover:text-[#04748c] transition-all flex items-center gap-1 truncate inline-flex w-full"
                            title={source}
                          >
                            <span className="truncate flex-1">{name}</span>
                            <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 opacity-60" />
                          </a>
                        ) : (
                          <span className="text-muted truncate flex-1" title={source}>{source}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Error Handling State */}
          {error && (
            <div id="error-alert-box" className="p-5 rounded-3xl glass border-red-500/30! flex gap-3 items-start">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-xs font-mono font-bold text-red-600 uppercase tracking-wider">search pipeline exception</h4>
                <p className="text-xs text-red-700/80 mt-1">{error}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={criteriaDirty ? handleRegenerateProfiles : () => {}}
                    className="px-4 py-2 rounded-full bg-red-500/10 border border-red-500/25 text-xs font-mono font-bold text-red-600 hover:bg-red-500/20 transition-all cursor-pointer"
                  >
                    retry sourcing execution
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
            <div id="criteria-dirty-banner" className="p-4 rounded-full glass border-[#00B4D8]/40! flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 pl-2">
                <div className="w-2 h-2 rounded-full bg-[#00B4D8]" />
                <p className="text-xs text-ink/70 font-mono">
                  you modified the sourcing filters — update the matching profiles to sync results with current chips.
                </p>
              </div>
              <button
                onClick={handleRegenerateProfiles}
                className="flex items-center gap-1.5 text-xs font-mono font-bold text-white bg-ink hover:bg-[#1a2233] px-5 py-2.5 rounded-full transition-all cursor-pointer active:scale-95 flex-shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>regenerate matches</span>
              </button>
            </div>
          )}

          {/* Sourcing Progress States */}
          {loading && (
            <div id="sourcing-progress-indicator" className="space-y-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-2 border-[#00B4D8]/15 border-t-[#00B4D8] animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[#00B4D8] animate-pulse" />
                  </div>
                </div>
                <h3 className="text-sm font-mono uppercase tracking-widest text-ink mt-6 font-bold">
                  {parsing ? "parsing recruiter intention..." : "searching live web directories..."}
                </h3>
                <p className="text-xs text-muted mt-2 max-w-sm">
                  {parsing
                    ? `Analyzing the query using ${selectedModel} to generate structured constraints and technological filters.`
                    : "Sourcing, validating, and extracting real public profiles and academic/professional links matching your parameters."}
                </p>
              </div>

              {/* Skeleton Loading Grids */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px] opacity-60">
                {[1, 2, 3, 4].map((skeletonId) => (
                  <div key={skeletonId} className="glass rounded-3xl p-6 space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-ink/5 animate-pulse" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-1/3 bg-ink/10 rounded animate-pulse" />
                        <div className="h-3 w-1/2 bg-ink/5 rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="space-y-2 pt-4 border-t border-ink/5">
                      <div className="h-3 w-full bg-ink/5 rounded animate-pulse" />
                      <div className="h-3 w-5/6 bg-ink/5 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Profiles Results Section */}
          {!loading && searchPerformed && (
            <div id="results-profiles-grid" className="space-y-6">
              <div className="flex items-center justify-between border-b border-ink/10 pb-3">
                <div className="flex items-center gap-3">
                  <h2 className="font-extrabold text-xl text-ink lowercase tracking-tight">
                    {isFallback ? "local placeholder results" : searchEngine === "tavily" ? "live multi-source search results" : "live grounded search results"}
                  </h2>
                  <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full border ${isFallback ? "bg-amber-500/10 border-amber-500/30 text-amber-700" : "bg-[#00B4D8]/10 border-[#00B4D8]/30 text-[#04748c]"}`}>
                    {candidates.length} profiles
                  </span>
                </div>
                <p className="text-[10px] text-muted font-mono hidden sm:block">
                  {isFallback ? "not verified — fabricated locally" : "verified public web profiles"}
                </p>
              </div>

              {candidates.length === 0 ? (
                <div className="text-center py-16 glass rounded-3xl">
                  <FileSearch className="w-8 h-8 text-muted mx-auto" />
                  <h4 className="text-sm font-bold text-ink mt-4 lowercase">no matching talent synthesized</h4>
                  <p className="text-xs text-muted mt-1 max-w-xs mx-auto">
                    No real, verifiable candidates were found for this query. Try broadening your criteria, or selecting a different reasoning engine.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-[18px]">
                  {candidates.map((candidate, idx) => (
                    <ResultCard key={`${candidate.name}-${idx}`} candidate={candidate} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty State / Welcome Splash when search has not run yet */}
          {!searchPerformed && !loading && (
            <div id="welcome-sourcing-splash" className="rounded-3xl glass p-8 text-center space-y-6">
              <div className="w-12 h-12 rounded-full bg-[#00B4D8]/10 border border-[#00B4D8]/25 flex items-center justify-center mx-auto text-[#00B4D8]">
                <Sparkles className="w-5 h-5" />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h3 className="font-extrabold text-lg text-ink lowercase tracking-tight">intelligent recruiter workspace</h3>
                <p className="text-xs text-muted leading-relaxed">
                  Provide natural language queries describing target PhD/scarcity profiles or system infrastructure hires. The system parses them into precise recruitment filters and populates interactive matching candidates.
                </p>
              </div>

              {/* Quick Sourcing Instructions / Value-prop block */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 max-w-3xl mx-auto border-t border-ink/10 text-left text-xs">
                <div className="p-4 rounded-2xl bg-white/60 border border-white/90 space-y-1">
                  <div className="text-[#04748c] font-mono font-bold text-[10px] uppercase tracking-wider">1 · intent parse</div>
                  <p className="text-muted text-[11px] leading-relaxed">Gemini identifies role title, seniority, locations, must-have skills, and academic pipelines.</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/60 border border-white/90 space-y-1">
                  <div className="text-[#04748c] font-mono font-bold text-[10px] uppercase tracking-wider">2 · tuning & filters</div>
                  <p className="text-muted text-[11px] leading-relaxed">Remove specific chips or edit constraints manually. Results and criteria sync seamlessly.</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/60 border border-white/90 space-y-1">
                  <div className="text-[#04748c] font-mono font-bold text-[10px] uppercase tracking-wider">3 · live multi-source search</div>
                  <p className="text-muted text-[11px] leading-relaxed">Searches LinkedIn, academic sources, and GitHub in parallel and returns only verifiable, real candidates with source links.</p>
                </div>
              </div>
            </div>
          )}

        </main>

        {/* Dark footer strip (tool-library style) */}
        <footer className="bg-ink text-white rounded-[36px_36px_0_0] px-6 py-14 text-center mt-8">
          <h3 className="m-0 mb-2.5 font-extrabold lowercase tracking-tight text-[clamp(26px,4vw,40px)]">keep sourcing</h3>
          <p className="font-mono text-[12px] text-white/65 leading-[1.8] max-w-[520px] mx-auto">
            natural language in, verified profiles out.<br />
            built on the gemini api + tavily live search.
          </p>
          <div className="flex gap-2.5 justify-center flex-wrap mt-6">
            <span className="font-mono text-[12px] font-bold border border-white/25 text-white rounded-full px-[18px] py-2.5">talent<span className="text-[#00B4D8]">os</span></span>
            <span className="font-mono text-[12px] font-bold bg-white text-ink border border-white rounded-full px-[18px] py-2.5">prototype v2</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
