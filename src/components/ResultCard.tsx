import React from "react";
import { MapPin, Calendar, Compass, Sparkles, Globe, Search, ArrowUpRight, ExternalLink } from "lucide-react";
import { Candidate } from "../types";

interface ResultCardProps {
  candidate: Candidate;
}

// Generate random aesthetic gradient backgrounds for avatars
const AVATAR_GRADIENTS = [
  "from-[#00F0FF]/30 to-[#0072FF]/30",
  "from-[#00F0FF]/30 to-[#8A2387]/30",
  "from-[#FF007F]/30 to-[#7F00FF]/30",
  "from-[#00FF87]/30 to-[#60EFFF]/30",
  "from-[#F12711]/30 to-[#F5AF19]/30",
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
  // Use a stable gradient based on the candidate's name
  const gradientIndex = Math.abs(
    candidate.name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  ) % AVATAR_GRADIENTS.length;
  
  const gradient = AVATAR_GRADIENTS[gradientIndex];

  return (
    <div
      id={`candidate-card-${candidate.name.replace(/\s+/g, "-").toLowerCase()}`}
      className="group relative rounded-2xl bg-[#11141b]/50 border border-white/5 p-6 backdrop-blur-md hover:border-[#00F0FF]/30 hover:shadow-[0_0_20px_rgba(0,240,255,0.06)] transition-all duration-300 flex flex-col justify-between"
    >
      {/* Glow effect on hover */}
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-[#00F0FF]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 pointer-events-none" />

      <div>
        {/* Top Header Row with Avatar and Core details */}
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-full bg-gradient-to-tr ${gradient} border border-white/10 flex items-center justify-center text-xs font-mono font-bold text-white tracking-wider shadow-[0_0_10px_rgba(0,240,255,0.1)] group-hover:shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all duration-300 flex-shrink-0`}>
            {getInitials(candidate.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-semibold text-base text-gray-100 group-hover:text-[#00F0FF] transition-colors duration-200 truncate">
                {candidate.name}
              </h3>
              {candidate.is_synthetic === false ? (
                <span className="text-[8px] font-mono tracking-wider uppercase font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                  Live Match
                </span>
              ) : (
                <span className="text-[8px] font-mono tracking-wider uppercase font-semibold px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-400">
                  Demo Draft
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              <span className="font-medium text-gray-300">{candidate.title}</span>
              <span className="text-gray-500 mx-1.5">@</span>
              <span className="text-[#00F0FF]/90 font-mono text-[11px]">{candidate.company}</span>
            </p>
          </div>
        </div>

        {/* Location & Experience badging */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 text-[11px] text-gray-400 font-sans border-t border-white/5 pt-3">
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-[#00F0FF]/60" />
            <span>{candidate.location}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-[#00F0FF]/60" />
            <span>{candidate.years_of_experience} Experience</span>
          </div>
        </div>

        {/* 1-Line Professional Pitch */}
        <p className="text-xs text-gray-300 italic mt-3 font-sans line-clamp-2">
          "{candidate.summary}"
        </p>

        {/* Key skills rendering */}
        <div className="flex flex-wrap gap-1.5 mt-4">
          {candidate.top_skills.map((skill, index) => (
            <span
              key={`${skill}-${index}`}
              className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-300"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Sourcing Actions / Link Navigation */}
      <div className="mt-5 pt-4 border-t border-white/5 flex flex-col gap-2">
        {candidate.is_synthetic === false ? (
          <div className="grid grid-cols-2 gap-2">
            {candidate.web_link ? (
              <a
                href={candidate.web_link}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all duration-200"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Visit Source</span>
                <ArrowUpRight className="w-3 h-3" />
              </a>
            ) : (
              <div className="flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-lg bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed">
                <Globe className="w-3.5 h-3.5" />
                <span>No Direct Link</span>
              </div>
            )}
            
            {candidate.search_query_url ? (
              <a
                href={candidate.search_query_url}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20 transition-all duration-200"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search LinkedIn</span>
                <ArrowUpRight className="w-3 h-3" />
              </a>
            ) : (
              <div className="flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-lg bg-white/5 border border-white/10 text-gray-500 cursor-not-allowed">
                <Search className="w-3.5 h-3.5" />
                <span>Search LinkedIn</span>
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
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-lg bg-[#00F0FF]/5 border border-[#00F0FF]/10 text-[#00F0FF] hover:bg-[#00F0FF]/15 hover:border-[#00F0FF]/25 transition-all duration-200"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Run X-Ray Google Search for Match</span>
                <ArrowUpRight className="w-3 h-3" />
              </a>
            ) : (
              <a
                href={`https://www.google.com/search?q=site:linkedin.com/in/+%22${encodeURIComponent(candidate.title)}%22+%22${encodeURIComponent(candidate.location)}%22`}
                target="_blank"
                rel="noreferrer noopener"
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:border-white/20 transition-all duration-200"
              >
                <Search className="w-3.5 h-3.5" />
                <span>X-Ray Sourcing Lookup</span>
                <ArrowUpRight className="w-3 h-3" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* AI Match Relevance Note Footer */}
      <div className="mt-5 pt-3 border-t border-white/5 bg-[#00F0FF]/[0.02] -mx-6 -mb-6 p-4 rounded-b-2xl border-t border-[#00F0FF]/10">
        <div className="flex gap-2 items-start">
          <div className={`p-1 rounded-md flex-shrink-0 ${candidate.is_synthetic === false ? "bg-emerald-500/10 text-emerald-400" : "bg-[#00F0FF]/10 text-[#00F0FF]"}`}>
            <Sparkles className="w-3 h-3" />
          </div>
          <p className="text-[11px] leading-relaxed text-gray-300 font-sans">
            <span className={`font-mono font-bold text-[9px] uppercase tracking-wider block mb-0.5 ${candidate.is_synthetic === false ? "text-emerald-400" : "text-[#00F0FF]"}`}>Sourcing Fit Match:</span>
            {candidate.ai_match_note}
          </p>
        </div>
      </div>
    </div>
  );
}
