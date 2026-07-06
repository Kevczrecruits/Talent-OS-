import React from "react";
import { X, Briefcase, MapPin, Award, BookOpen, Layers, Star, Users } from "lucide-react";
import { SourcingCriteria } from "../types";

interface FilterChipsProps {
  criteria: SourcingCriteria | null;
  onRemoveChip: (category: keyof SourcingCriteria, value?: string) => void;
  onClearAll: () => void;
}

export default function FilterChips({ criteria, onRemoveChip, onClearAll }: FilterChipsProps) {
  if (!criteria) return null;

  // Check if we have any active filters at all
  const hasActiveFilters =
    !!criteria.role ||
    !!criteria.seniority_level ||
    !!criteria.location ||
    criteria.required_skills.length > 0 ||
    criteria.preferred_skills.length > 0 ||
    !!criteria.industry ||
    criteria.education_signals.length > 0 ||
    !!criteria.diversity_or_demographic_filters;

  if (!hasActiveFilters) {
    return (
      <div id="no-filters-container" className="flex items-center justify-between p-4 bg-[#11141b]/60 border border-white/5 rounded-xl">
        <span className="text-xs text-gray-500 italic">No search criteria defined yet. Describe your candidate above to begin.</span>
      </div>
    );
  }

  const renderChip = (
    label: string,
    category: keyof SourcingCriteria,
    valueToRemove?: string,
    icon?: React.ReactNode,
    colorClass = "border-[#00F0FF]/30 text-[#00F0FF] bg-[#00F0FF]/5"
  ) => {
    return (
      <div
        key={`${category}-${valueToRemove || label}`}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-sans border transition-all ${colorClass}`}
      >
        {icon && <span className="opacity-80">{icon}</span>}
        <span>{label}</span>
        <button
          onClick={() => onRemoveChip(category, valueToRemove)}
          className="hover:bg-white/10 rounded-full p-0.5 transition-colors cursor-pointer"
          title="Remove criteria"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  };

  return (
    <div id="filter-chips-section" className="space-y-3 p-5 rounded-2xl bg-[#11141b]/40 border border-white/5 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <h4 className="text-xs font-mono uppercase tracking-widest text-gray-400">Parsed Sourcing Criteria</h4>
        <button
          onClick={onClearAll}
          className="text-xs text-[#00F0FF] hover:underline transition-all cursor-pointer font-sans"
        >
          Reset All
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Role Chip */}
        {criteria.role &&
          renderChip(
            `Role: ${criteria.role}`,
            "role",
            undefined,
            <Briefcase className="w-3.5 h-3.5" />,
            "border-cyan-500/30 text-cyan-400 bg-cyan-950/20"
          )}

        {/* Seniority Chip */}
        {criteria.seniority_level &&
          renderChip(
            `Seniority: ${criteria.seniority_level}`,
            "seniority_level",
            undefined,
            <Award className="w-3.5 h-3.5" />,
            "border-emerald-500/30 text-emerald-400 bg-emerald-950/20"
          )}

        {/* Location Chip */}
        {criteria.location &&
          renderChip(
            `Location: ${criteria.location}`,
            "location",
            undefined,
            <MapPin className="w-3.5 h-3.5" />,
            "border-amber-500/30 text-amber-400 bg-amber-950/20"
          )}

        {/* Industry Chip */}
        {criteria.industry &&
          renderChip(
            `Industry: ${criteria.industry}`,
            "industry",
            undefined,
            <Layers className="w-3.5 h-3.5" />,
            "border-purple-500/30 text-purple-400 bg-purple-950/20"
          )}

        {/* Required Skills */}
        {criteria.required_skills.map((skill) =>
          renderChip(
            skill,
            "required_skills",
            skill,
            <Star className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" />,
            "border-[#00F0FF]/30 text-[#00F0FF] bg-[#00F0FF]/5"
          )
        )}

        {/* Preferred Skills */}
        {criteria.preferred_skills.map((skill) =>
          renderChip(
            skill,
            "preferred_skills",
            skill,
            <Star className="w-3.5 h-3.5 text-indigo-400" />,
            "border-indigo-500/30 text-indigo-400 bg-indigo-950/20"
          )
        )}

        {/* Education Signals */}
        {criteria.education_signals.map((edu) =>
          renderChip(
            edu,
            "education_signals",
            edu,
            <BookOpen className="w-3.5 h-3.5" />,
            "border-pink-500/30 text-pink-400 bg-pink-950/20"
          )
        )}

        {/* Diversity Filter */}
        {criteria.diversity_or_demographic_filters &&
          renderChip(
            `Demographics: ${criteria.diversity_or_demographic_filters}`,
            "diversity_or_demographic_filters",
            undefined,
            <Users className="w-3.5 h-3.5" />,
            "border-orange-500/30 text-orange-400 bg-orange-950/20"
          )}
      </div>

      {criteria.other_notes && (
        <div className="text-[11px] text-gray-500 mt-2 border-t border-white/5 pt-2 flex flex-col gap-0.5">
          <span className="font-mono text-[9px] uppercase tracking-wider text-gray-400">Assistant Sourcing Notes:</span>
          <p className="italic font-sans">{criteria.other_notes}</p>
        </div>
      )}
    </div>
  );
}
