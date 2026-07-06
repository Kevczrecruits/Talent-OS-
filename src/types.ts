export interface SourcingCriteria {
  role: string;
  seniority_level: string;
  location: string;
  required_skills: string[];
  preferred_skills: string[];
  industry: string;
  education_signals: string[];
  diversity_or_demographic_filters: string;
  other_notes: string;
}

export interface Candidate {
  name: string;
  title: string;
  company: string;
  location: string;
  top_skills: string[];
  years_of_experience: string;
  summary: string;
  ai_match_note: string;
  web_link?: string;
  search_query_url?: string;
  is_synthetic?: boolean;
}
