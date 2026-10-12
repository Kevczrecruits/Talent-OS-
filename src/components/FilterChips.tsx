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
      <div id="no-filters-container" className="flex items-center justify-between p-4 glass rounded-2xl">
        <span className="text-xs text-muted italic font-mono">no search criteria defined yet — describe your candidate above to begin.</span>
      </div>
    );
  }

  const renderChip = (
    label: string,
    category: keyof SourcingCriteria,
    valueToRemove?: string,
    icon?: React.ReactNode,
    colorClass = "border-[#00B4D8]/40 text-[#04748c] bg-[#00B4D8]/10"
  ) => {
    return (
      <div
        key={`${category}-${valueToRemove || label}`}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border transition-all hover:-translate-y-px ${colorClass}`}
      >
        {icon && <span className="opacity-80">{icon}</span>}
        <span>{label}</span>
        <button
          onClick={() => onRemoveChip(category, valueToRemove)}
          className="hover:bg-ink/10 rounded-full p-0.5 transition-colors cursor-pointer"
          title="Remove criteria"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  };

  return (
    <div id="filter-chips-section" className="space-y-3 p-5 rounded-3xl glass">
      <div className="flex items-center justify-between border-b border-ink/10 pb-2.5">
        <h4 className="kicker">parsed sourcing criteria</h4>
        <button
          onClick={onClearAll}
          className="text-xs font-mono font-bold text-[#04748c] hover:underline transition-all cursor-pointer"
        >
          reset all
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* Role Chip */}
        {criteria.role &&
          renderChip(
            `role: ${criteria.role}`,
            "role",
            undefined,
            <Briefcase className="w-3.5 h-3.5" />,
            "border-[#00B4D8]/40 text-[#04748c] bg-[#00B4D8]/10"
          )}

        {/* Seniority Chip */}
        {criteria.seniority_level &&
          renderChip(
            `seniority: ${criteria.seniority_level}`,
            "seniority_level",
            undefined,
            <Award className="w-3.5 h-3.5" />,
            "border-[#00B4D8]/40 text-[#04748c] bg-[#00B4D8]/10"
          )}

        {/* Location Chip */}
        {criteria.location &&
          renderChip(
            `location: ${criteria.location}`,
            "location",
            undefined,
            <MapPin className="w-3.5 h-3.5" />,
            "border-amber-500/40 text-amber-700 bg-amber-500/10"
          )}

        {/* Industry Chip */}
        {criteria.industry &&
          renderChip(
            `industry: ${criteria.industry}`,
            "industry",
            undefined,
            <Layers className="w-3.5 h-3.5" />,
            "border-purple-500/40 text-purple-700 bg-purple-500/10"
          )}

        {/* Required Skills */}
        {criteria.required_skills.map((skill) =>
          renderChip(
            skill,
            "required_skills",
            skill,
            <Star className="w-3.5 h-3.5 text-[#00B4D8] fill-[#00B4D8]/25" />,
            "border-[#00B4D8]/40 text-[#04748c] bg-[#00B4D8]/10"
          )
        )}

        {/* Preferred Skills */}
        {criteria.preferred_skills.map((skill) =>
          renderChip(
            skill,
            "preferred_skills",
            skill,
            <Star className="w-3.5 h-3.5 text-indigo-500" />,
            "border-indigo-500/40 text-indigo-700 bg-indigo-500/10"
          )
        )}

        {/* Education Signals */}
        {criteria.education_signals.map((edu) =>
          renderChip(
            edu,
            "education_signals",
            edu,
            <BookOpen className="w-3.5 h-3.5" />,
            "border-pink-500/40 text-pink-700 bg-pink-500/10"
          )
        )}

        {/* Diversity Filter */}
        {criteria.diversity_or_demographic_filters &&
          renderChip(
            `demographics: ${criteria.diversity_or_demographic_filters}`,
            "diversity_or_demographic_filters",
            undefined,
            <Users className="w-3.5 h-3.5" />,
            "border-orange-500/40 text-orange-700 bg-orange-500/10"
          )}
      </div>

      {criteria.other_notes && (
        <div className="text-[11px] text-muted mt-2 border-t border-ink/10 pt-2.5 flex flex-col gap-0.5">
          <span className="font-mono text-[9px] uppercase tracking-wider text-muted">assistant sourcing notes:</span>
          <p className="italic">{criteria.other_notes}</p>
        </div>
      )}
    </div>
  );
}
