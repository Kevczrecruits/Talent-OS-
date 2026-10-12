import React, { useState, useEffect } from "react";
import { MapPin, Calendar, Compass, Sparkles, Globe, Search, ArrowUpRight, ExternalLink, RefreshCw, AlertCircle } from "lucide-react";
import { Candidate } from "../types";

interface ResultCardProps {
  candidate: Candidate;
}

// Light-friendly aesthetic gradient backgrounds for avatars (tool-library palette)
const AVATAR_GRADIENTS = [
  "from-[#00B4D8]/30 to-[#0072FF]/30",
  "from-[#00B4D8]/30 to-[#8A2387]/30",
  "from-[#FF007F]/25 to-[#7F00FF]/25",
  "from-[#00FF87]/40 to-[#60EFFF]/40",
  "from-[#F12711]/25 to-[#F5AF19]/25",
];

const getInitials = (name: string) => {
  if (!name) return "??";
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export default function ResultCard({ candidate }: ResultCardProps) {
  const [verifying, setVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "checking" | "reachable" | "rate_limited" | "not_found" | "error">("idle");
  const [verifyCode, setVerifyCode] = useState<number | null>(null);

  // Auto-run verification on mount if candidate is grounded and has web_link
  useEffect(() => {
    if (candidate.is_synthetic === false && candidate.web_link) {
      runVerification();
    } else {
      setVerifyStatus("idle");
    }
  }, [candidate.web_link, candidate.is_synthetic]);

  const runVerification = async () => {
    if (!candidate.web_link) return;
    setVerifying(true);
    setVerifyStatus("checking");

    try {
      const res = await fetch("/api/verify-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: candidate.web_link }),
      });

      if (!res.ok) {
        throw new Error("Verification call failed");
      }

      const data = await res.json();
      if (data.status === "reachable") {
        setVerifyStatus("reachable");
        setVerifyCode(200);
      } else if (data.status === "rate_limited") {
        setVerifyStatus("rate_limited");
        setVerifyCode(data.code || 429);
      } else if (data.status === "not_found") {
        setVerifyStatus("not_found");
        setVerifyCode(404);
      } else {
        setVerifyStatus("error");
      }
    } catch (err) {
      setVerifyStatus("error");
    } finally {
      setVerifying(false);
    }
  };

  // Use a stable gradient based on the candidate's name
  const safeName = candidate.name || "candidate";
  const gradientIndex = Math.abs(
    safeName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  ) % AVATAR_GRADIENTS.length;

  // Defensive: the API should normalize, but never let a malformed
  // candidate crash the whole results grid again.
  const topSkills: string[] = Array.isArray(candidate.top_skills)
    ? candidate.top_skills.map((s) => String(s))
    : [];

  const gradient = AVATAR_GRADIENTS[gradientIndex];

  return (
    <div
      id={`candidate-card-${safeName.replace(/\s+/g, "-").toLowerCase()}`}
      className="group relative rounded-3xl glass p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(0,0,0,0.07)] flex flex-col justify-between"
    >
      <div>
        {/* Top Header Row with Avatar and Core details */}
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${gradient} border border-white/90 flex items-center justify-center text-xs font-mono font-bold text-ink tracking-wider shadow-[0_6px_18px_rgba(0,0,0,0.06)] flex-shrink-0`}>
            {getInitials(candidate.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-extrabold text-[17px] text-ink tracking-tight lowercase group-hover:text-[#04748c] transition-colors duration-200 truncate">
                {candidate.name}
              </h3>
              {candidate.is_synthetic === false ? (
                <>
                  <span className="text-[8px] font-mono tracking-wider uppercase font-bold px-1.5 py-0.5 rounded-full bg-[#00B4D8]/10 border border-[#00B4D8]/30 text-[#04748c] flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-[#00B4D8] shadow-[0_0_8px_#00B4D8] animate-pulse" />
                    live match
                  </span>

                  {/* Verification Status Badge */}
                  {verifyStatus === "checking" && (
                    <span className="text-[8px] font-mono tracking-wider uppercase font-bold px-1.5 py-0.5 rounded-full bg-[#00B4D8]/10 border border-[#00B4D8]/30 text-[#04748c] flex items-center gap-1 animate-pulse">
                      <RefreshCw className="w-2 h-2 animate-spin" />
                      validating link…
                    </span>
                  )}
                  {verifyStatus === "reachable" && (
                    <span className="text-[8px] font-mono tracking-wider uppercase font-bold px-1.5 py-0.5 rounded-full bg-[#00B4D8]/10 border border-[#00B4D8]/40 text-[#04748c] flex items-center gap-1" title="Connection verified.">
                      ● active link
                    </span>
                  )}
                  {verifyStatus === "rate_limited" && (
                    <span className="text-[8px] font-mono tracking-wider uppercase font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 flex items-center gap-1" title="Domain protects against automated checks, but is verified active.">
                      ● domain secured
                    </span>
                  )}
                  {verifyStatus === "not_found" && (
                    <span className="text-[8px] font-mono tracking-wider uppercase font-bold px-1.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-600 flex items-center gap-1">
                      ● broken link (404)
                    </span>
                  )}
                  {verifyStatus === "error" && (
                    <span className="text-[8px] font-mono tracking-wider uppercase font-bold px-1.5 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-700 flex items-center gap-1" title="Network timeout or unreachable host.">
                      ● timeout / offline
                    </span>
                  )}
                </>
              ) : (
                <span className="text-[8px] font-mono tracking-wider uppercase font-bold px-1.5 py-0.5 rounded-full bg-ink/5 border border-ink/10 text-muted">
                  demo draft
                </span>
              )}
            </div>
            <p className="text-xs text-muted mt-0.5 truncate">
              <span className="font-bold text-ink/80">{candidate.title}</span>
              <span className="text-muted/60 mx-1.5">@</span>
              <span className="text-[#04748c] font-mono text-[11px]">{candidate.company}</span>
            </p>
          </div>
        </div>

        {/* Location & Experience badging */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-[11px] text-muted border-t border-ink/10 pt-3">
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-[#00B4D8]" />
            <span>{candidate.location}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-[#00B4D8]" />
            <span>{candidate.years_of_experience} experience</span>
          </div>
        </div>

        {/* 1-Line Professional Pitch */}
        <p className="text-xs text-ink/70 italic mt-3 line-clamp-2">
          "{candidate.summary}"
        </p>

        {/* Key skills rendering */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {topSkills.map((skill, index) => (
            <span
              key={`${skill}-${index}`}
              className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-ink/[0.06] text-ink"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Sourcing Actions / Link Navigation */}
      <div className="mt-5 pt-4 border-t border-ink/10 flex flex-col gap-2">
        {candidate.is_synthetic === false ? (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              {candidate.web_link ? (
                <a
                  href={candidate.web_link}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={`flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-mono font-bold rounded-full transition-all duration-200 ${
                    verifyStatus === "reachable"
                      ? "bg-[#00B4D8]/15 border border-[#00B4D8]/40 text-[#04748c] hover:bg-[#00B4D8]/25"
                      : verifyStatus === "not_found"
                      ? "bg-red-500/10 border border-red-500/30 text-red-600 hover:bg-red-500/20"
                      : "bg-[#00B4D8]/10 border border-[#00B4D8]/25 text-[#04748c] hover:bg-[#00B4D8]/20"
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>visit source</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              ) : (
                <div className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-mono font-bold rounded-full bg-ink/5 border border-ink/10 text-muted cursor-not-allowed">
                  <Globe className="w-3.5 h-3.5" />
                  <span>no direct link</span>
                </div>
              )}

              {candidate.search_query_url ? (
                <a
                  href={candidate.search_query_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-mono font-bold rounded-full bg-ink text-white hover:bg-[#1a2233] transition-all duration-200"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>search linkedin</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              ) : (
                <div className="flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-mono font-bold rounded-full bg-ink/5 border border-ink/10 text-muted cursor-not-allowed">
                  <Search className="w-3.5 h-3.5" />
                  <span>search linkedin</span>
                </div>
              )}
            </div>

            {/* Re-verify action trigger */}
            {candidate.web_link && (
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={verifying}
                  onClick={runVerification}
                  className="text-[9px] font-mono font-bold text-muted hover:text-[#04748c] disabled:text-muted/50 transition-colors flex items-center gap-1.5 cursor-pointer lowercase"
                >
                  <RefreshCw className={`w-2.5 h-2.5 ${verifying ? "animate-spin text-[#00B4D8]" : ""}`} />
                  <span>{verifying ? "re-verifying url…" : "force link re-check"}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            {candidate.search_query_url ? (
              <a
                href={candidate.search_query_url}
                target="_blank"
                rel="noreferrer noopener"
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-mono font-bold rounded-full bg-[#00B4D8]/10 border border-[#00B4D8]/25 text-[#04748c] hover:bg-[#00B4D8]/20 transition-all duration-200"
              >
                <Search className="w-3.5 h-3.5" />
                <span>run x-ray google search for match</span>
                <ArrowUpRight className="w-3 h-3" />
              </a>
            ) : (
              <a
                href={`https://www.google.com/search?q=site:linkedin.com/in/+%22${encodeURIComponent(candidate.title)}%22+%22${encodeURIComponent(candidate.location)}%22`}
                target="_blank"
                rel="noreferrer noopener"
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-mono font-bold rounded-full bg-ink/5 border border-ink/10 text-ink/70 hover:bg-ink/10 transition-all duration-200"
              >
                <Search className="w-3.5 h-3.5" />
                <span>x-ray sourcing lookup</span>
                <ArrowUpRight className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* AI Match Relevance Note Footer */}
      <div className="mt-5 -mx-6 -mb-6 px-6 py-4 rounded-b-3xl bg-[#00B4D8]/[0.05] border-t border-[#00B4D8]/15">
        <div className="flex gap-2 items-start">
          <div className="p-1 rounded-lg flex-shrink-0 bg-[#00B4D8]/15 text-[#04748c]">
            <Sparkles className="w-3 h-3" />
          </div>
          <p className="text-[11px] leading-relaxed text-ink/70">
            <span className="font-mono font-bold text-[9px] uppercase tracking-wider block mb-0.5 text-[#04748c]">sourcing fit match:</span>
            {candidate.ai_match_note}
          </p>
        </div>
      </div>
    </div>
  );
}
