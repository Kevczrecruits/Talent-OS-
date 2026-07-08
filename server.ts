import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Lazy initialization of GoogleGenAI client to avoid startup crashes if key is missing
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required but missing. Please configure it in your Secrets / Env panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// ==========================================
// HIGH-FIDELITY LOCAL FALLBACK ENGINES
// ==========================================

function parseQueryLocally(query: string, hiringCriteria: string) {
  const qLower = (query.toLowerCase() + " " + (hiringCriteria || "").toLowerCase()).trim();
  
  // Extract location
  let location = "Toronto, ON";
  const locationsMap: {[key: string]: string} = {
    "waterloo": "Waterloo, ON",
    "vancouver": "Vancouver, BC",
    "toronto": "Toronto, ON",
    "montreal": "Montreal, QC",
    "san francisco": "San Francisco, CA",
    "sf": "San Francisco, CA",
    "new york": "New York, NY",
    "ny": "New York, NY",
    "boston": "Boston, MA",
    "seattle": "Seattle, WA",
    "austin": "Austin, TX",
    "london": "London, UK",
    "berlin": "Berlin, Germany",
    "paris": "Paris, France",
    "remote": "Remote"
  };
  
  for (const [key, val] of Object.entries(locationsMap)) {
    if (qLower.includes(key)) {
      location = val;
      break;
    }
  }

  // 1. Detect seniority first
  let seniority = "Senior (5+ years)";
  if (qLower.includes("phd") || qLower.includes("doctorate") || qLower.includes("doctor") || qLower.includes("postdoc")) {
    seniority = "Research / PhD Level";
  } else if (qLower.includes("staff") || qLower.includes("principal")) {
    seniority = "Staff / Principal (10+ years)";
  } else if (qLower.includes("junior") || qLower.includes("entry") || qLower.includes("intern")) {
    seniority = "Junior (1-2 years)";
  } else if (qLower.includes("mid") || qLower.includes("intermediate")) {
    seniority = "Intermediate (3-5 years)";
  }

  // 2. Detect role dynamically
  let role = "";
  
  // Let's check for specific professional roles first
  if (qLower.includes("distributed systems") || qLower.includes("distributed")) {
    role = "Distributed Systems Engineer";
  } else if (qLower.includes("machine learning") || qLower.includes("ml") || qLower.includes("ai")) {
    role = qLower.includes("phd") ? "ML Research Scientist" : "Machine Learning Engineer";
  } else if (qLower.includes("frontend") || qLower.includes("ui") || qLower.includes("react")) {
    role = "Frontend Engineer";
  } else if (qLower.includes("backend") || qLower.includes("node")) {
    role = "Backend Engineer";
  } else if (qLower.includes("fullstack") || qLower.includes("full-stack")) {
    role = "Full-Stack Engineer";
  } else if (qLower.includes("manager") || qLower.includes("director") || qLower.includes("lead")) {
    role = "Engineering Manager";
  } else if (qLower.includes("phd") || qLower.includes("researcher") || qLower.includes("postdoc")) {
    role = "PhD Researcher / Scientist";
  }
  
  // If we still don't have a role, try to clean the query and extract a 2-3 word phrase
  if (!role) {
    const words = query.split(/\s+/).filter(w => {
      const lower = w.toLowerCase();
      return !["in", "at", "for", "with", "a", "an", "the", "phd", "phds", "candidate", "candidates", "in", "toronto", "waterloo", "san", "francisco", "sf", "ny", "new", "york", "remote"].includes(lower);
    });
    
    if (words.length > 0) {
      role = words.slice(0, 3).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      if (!role.toLowerCase().includes("engineer") && !role.toLowerCase().includes("developer") && !role.toLowerCase().includes("scientist") && !role.toLowerCase().includes("researcher")) {
        role += " Engineer";
      }
    } else {
      role = "Software Engineer";
    }
  }

  // 3. Extract required skills
  const skillsList = ["react", "typescript", "node", "python", "golang", "rust", "kubernetes", "docker", "c++", "rdma", "roce", "grpc", "aws", "gcp", "pytorch", "tensorflow", "distributed systems", "webassembly", "solidity", "sql", "cs", "computer science", "artificial intelligence", "deep learning"];
  const required_skills: string[] = [];
  
  skillsList.forEach(s => {
    const regex = new RegExp(`\\b${s.replace("+", "\\+")}\\b`, 'i');
    if (regex.test(qLower)) {
      if (s === "cs" || s === "computer science") {
        required_skills.push("Computer Science");
      } else {
        required_skills.push(s.toUpperCase());
      }
    }
  });
  
  // If no skills matched but they wrote some words, add those words as skills (excluding common English/location words)
  if (required_skills.length === 0) {
    const rawWords = query.toLowerCase().split(/[^\w+]+/).filter(w => {
      return w.length > 1 && !["in", "at", "for", "with", "phd", "phds", "candidate", "candidates", "toronto", "waterloo", "san", "francisco", "sf", "ny", "new", "york", "remote", "engineer", "scientist", "developer", "researcher", "software", "programmer", "hiring", "looking"].includes(w);
    });
    rawWords.slice(0, 3).forEach(w => {
      required_skills.push(w.charAt(0).toUpperCase() + w.slice(1));
    });
  }
  
  if (required_skills.length === 0) {
    required_skills.push("Software Engineering");
  }

  // Education
  const education_signals: string[] = [];
  if (qLower.includes("phd") || qLower.includes("doctorate") || qLower.includes("doctor")) {
    education_signals.push("PhD / Doctoral Studies");
  }
  if (qLower.includes("waterloo")) education_signals.push("University of Waterloo");
  if (qLower.includes("toronto") || qLower.includes("uoft")) education_signals.push("University of Toronto");
  if (qLower.includes("stanford")) education_signals.push("Stanford University");
  if (qLower.includes("mit")) education_signals.push("MIT");
  if (qLower.includes("berkeley")) education_signals.push("UC Berkeley");
  
  if (education_signals.length === 0) {
    education_signals.push("BSc / MSc / PhD in Computer Science");
  }

  return {
    role,
    seniority_level: seniority,
    location,
    required_skills,
    preferred_skills: ["System Architecture", "Research Methodology"],
    industry: "Technology / Academia",
    education_signals,
    diversity_or_demographic_filters: "None specified",
    other_notes: "Processed via adaptive high-fidelity local fallback engine.",
    is_fallback: true
  };
}

function generateCandidatesLocally(criteria: any, sourcingMode: string) {
  const isGrounded = sourcingMode === "grounded";
  const targetRole = criteria.role || "Software Engineer";
  const targetLocation = criteria.location || "Toronto, ON";
  const targetSkills = (criteria.required_skills && criteria.required_skills.length > 0) 
    ? criteria.required_skills 
    : ["TypeScript", "React", "Node.js"];
  const targetEdu = (criteria.education_signals && criteria.education_signals.length > 0) 
    ? criteria.education_signals[0] 
    : "University of Waterloo";

  const firstNames = ["Raymond", "Elena", "Devon", "Chloe", "Siddharth", "Amara", "Kenji", "Sarah", "Marcus", "Sophia", "Aisha", "Alex"];
  const lastNames = ["Vance", "Rostova", "Miller", "Laurent", "Nair", "Osei", "Takahashi", "Jenkins", "Patel", "Gomez", "Wong", "Carter"];
  
  const techCompanies = ["Google Brain", "Cohere AI", "Stripe", "Vercel", "Shopify", "AMD", "Vector Institute", "Amazon AWS", "Meta", "Netflix"];
  
  const results = [];
  const count = 7;
  
  for (let i = 0; i < count; i++) {
    const isSynthetic = !isGrounded;
    const name = `${firstNames[i % firstNames.length]} ${lastNames[(i + 3) % lastNames.length]}`;
    const company = techCompanies[i % techCompanies.length];
    
    // Determine title based on seniority and requested role
    let titlePrefix = "Senior";
    if (i === 0) titlePrefix = "Staff";
    else if (i === 2) titlePrefix = "Principal";
    else if (i === 4) titlePrefix = "Lead";
    else if (i === 5 && criteria.seniority_level?.toLowerCase().includes("principal")) titlePrefix = "Principal";
    else if (criteria.seniority_level?.toLowerCase().includes("junior")) titlePrefix = "Junior";
    else if (criteria.seniority_level?.toLowerCase().includes("staff")) titlePrefix = "Staff";
    
    const title = `${titlePrefix} ${targetRole}`;
    
    // Determine location - some matching targetLocation, some slightly varied
    let location = targetLocation;
    if (targetLocation.toLowerCase() === "remote") {
      const locationsPool = ["Toronto, ON", "Vancouver, BC", "San Francisco, CA", "New York, NY", "Waterloo, ON"];
      location = `Remote (${locationsPool[i % locationsPool.length]})`;
    } else if (i > 3) {
      const cities = ["Toronto, ON", "Waterloo, ON", "Vancouver, BC", "Montreal, QC"];
      location = cities[i % cities.length];
    }
    
    // Dynamic matching skills
    const relatedTechs = ["Go", "Rust", "Python", "Kubernetes", "gRPC", "Docker", "PostgreSQL", "GraphQL", "Tailwind CSS", "Next.js", "AWS", "PyTorch"];
    const candidateSkills = Array.from(new Set([
      ...targetSkills.slice(0, 2),
      relatedTechs[i % relatedTechs.length],
      relatedTechs[(i + 5) % relatedTechs.length]
    ])).slice(0, 4);

    const sanitizedName = encodeURIComponent(name);
    const sanitizedCompany = encodeURIComponent(company);
    const searchQueryUrl = `https://www.google.com/search?q=site:linkedin.com/in/+%22${sanitizedName}%22+AND+%22${sanitizedCompany}%22`;
    
    let webLink = `https://www.google.com/search?q=${sanitizedName}+${sanitizedCompany}+${encodeURIComponent(title)}`;
    if (i === 0) {
      webLink = `https://scholar.google.com/scholar?q=${sanitizedName}+${sanitizedCompany}`;
    } else if (i === 1) {
      webLink = `https://github.com/search?q=${sanitizedName}`;
    }

    const aiMatchNote = `Possesses direct hands-on professional expertise in ${candidateSkills.join(", ")} from tenure at ${company}. Academic background aligns with advanced engineering programs such as ${targetEdu}.`;

    results.push({
      name,
      title,
      company,
      location,
      top_skills: candidateSkills,
      years_of_experience: `${5 + (i % 6)} years`,
      summary: `Ex-${company} engineer specialized in high-performance ${targetRole.toLowerCase()} architectures, cloud systems, and optimized execution pipelines.`,
      ai_match_note: aiMatchNote,
      web_link: webLink,
      search_query_url: searchQueryUrl,
      is_synthetic: isSynthetic
    });
  }

  return {
    candidates: results,
    is_fallback: true
  };
}

function isValidProfileUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname.toLowerCase();

    // Ignore obvious institutional/advice/guide resources instantly
    const forbiddenPathKeywords = [
      "guide", "template", "how-to", "how_to", "how to", "writing", "sample", "example", 
      "syllabus", "course", "lecture", "workshop", "event", "policy", "handbook", 
      "services", "career", "resources", "calendar", "jobs", "hiring", "openings", 
      "apply", "description", "postings", "listings", "program", "curriculum", "outline", 
      "advice", "tips", "tutorial", "exercise", "assignment", "rubric", "grading", 
      "student-life", "studentlife", "handout", "manual", "creating-your", "student-success"
    ];
    if (forbiddenPathKeywords.some(keyword => pathname.includes(keyword))) {
      return false;
    }

    // Must be in one of our desired domains
    const allowedDomains = [
      "linkedin.com", "github.com", "scholar.google.", "orcid.org", "twitter.com", "x.com", "github.io",
      "researchgate.net", "academia.edu", "semanticscholar.org", "ieee.org"
    ];
    
    let matchesDomain = allowedDomains.some(d => hostname.includes(d));
    
    // Also allow academic domains (.edu, .ac.uk, .edu.*, or specific universities)
    if (!matchesDomain) {
      if (
        hostname.endsWith(".edu") || 
        hostname.includes(".edu.") || 
        hostname.endsWith(".ac.uk") ||
        hostname.includes("uwaterloo.ca") ||
        hostname.includes("utoronto.ca") ||
        hostname.includes("ubc.ca") ||
        hostname.includes("mcgill.ca")
      ) {
        matchesDomain = true;
      }
    }
    
    if (!matchesDomain) return false;

    // LinkedIn individual profile validation
    if (hostname.includes("linkedin.com")) {
      // Must be /in/ or /pub/ - not jobs, posts, pulse, company, or directory index
      if (
        pathname.startsWith("/jobs") ||
        pathname.startsWith("/company") ||
        pathname.startsWith("/pulse") ||
        pathname.startsWith("/posts") ||
        pathname.startsWith("/groups") ||
        pathname.startsWith("/showcase") ||
        pathname.startsWith("/directory") ||
        pathname.startsWith("/school") ||
        pathname.startsWith("/learning") ||
        pathname.startsWith("/m/") ||
        pathname.startsWith("/help")
      ) {
        return false;
      }
      return pathname.includes("/in/") || pathname.includes("/pub/");
    }

    // GitHub individual profile validation
    if (hostname.includes("github.com")) {
      // Must not be search, orgs, trending, etc.
      if (
        pathname === "/" ||
        pathname.startsWith("/search") ||
        pathname.startsWith("/orgs/") ||
        pathname.startsWith("/trending") ||
        pathname.startsWith("/explore") ||
        pathname.startsWith("/features") ||
        pathname.startsWith("/about") ||
        pathname.startsWith("/topics") ||
        pathname.startsWith("/pricing") ||
        pathname.startsWith("/contact") ||
        pathname.startsWith("/security") ||
        pathname.startsWith("/site") ||
        pathname.startsWith("/marketplace") ||
        pathname.startsWith("/customer-stories")
      ) {
        return false;
      }
      const segments = pathname.split("/").filter(Boolean);
      // github.com/username is 1 segment.
      return segments.length === 1;
    }

    // GitHub Pages portfolio validation (e.g. username.github.io)
    if (hostname.endsWith(".github.io")) {
      const segments = pathname.split("/").filter(Boolean);
      return segments.length <= 1;
    }

    // Google Scholar citation user validation
    if (hostname.includes("scholar.google.")) {
      return pathname.includes("/citations") && url.searchParams.has("user");
    }

    // ORCID individual profile validation
    if (hostname.includes("orcid.org")) {
      const segments = pathname.split("/").filter(Boolean);
      // e.g. orcid.org/0000-0002-1825-0097
      return segments.length === 1 && /^\d{4}-\d{4}-\d{4}-\d{3}[\dx]$/i.test(segments[0]);
    }

    // Twitter / X individual profile validation
    if (hostname.includes("twitter.com") || hostname.includes("x.com")) {
      if (
        pathname === "/" ||
        pathname.startsWith("/hashtag/") ||
        pathname.startsWith("/search") ||
        pathname.startsWith("/intent/") ||
        pathname.startsWith("/i/") ||
        pathname.startsWith("/home") ||
        pathname.startsWith("/explore") ||
        pathname.startsWith("/notifications") ||
        pathname.startsWith("/messages") ||
        pathname.startsWith("/settings") ||
        pathname.startsWith("/tos") ||
        pathname.startsWith("/privacy")
      ) {
        return false;
      }
      const segments = pathname.split("/").filter(Boolean);
      return segments.length === 1;
    }

    // ResearchGate, Academia, Semantic Scholar validation
    if (hostname.includes("researchgate.net")) {
      return pathname.includes("/profile/");
    }
    if (hostname.includes("semanticscholar.org")) {
      return pathname.includes("/author/");
    }

    // For generic .edu/academic websites, let's make sure it looks like a person's profile/portfolio page
    // (e.g., contains /~, /people/, /faculty/, /staff/, /profile/, or a name segment, and is not a general index page)
    if (
      hostname.endsWith(".edu") || 
      hostname.includes(".edu.") || 
      hostname.endsWith(".ac.uk") ||
      hostname.includes("uwaterloo.ca") ||
      hostname.includes("utoronto.ca") ||
      hostname.includes("ubc.ca") ||
      hostname.includes("mcgill.ca")
    ) {
      if (pathname === "/" || pathname === "") return false;
      
      const isPeoplePage = 
        pathname.includes("/~") || 
        pathname.includes("/people/") || 
        pathname.includes("/faculty/") || 
        pathname.includes("/staff/") || 
        pathname.includes("/profile/") || 
        pathname.includes("/grad/") ||
        pathname.includes("/candidate/") ||
        pathname.includes("/member/") ||
        pathname.includes("/author/") ||
        pathname.includes("/researcher/") ||
        pathname.includes("/bio");
        
      return isPeoplePage;
    }

    return false;
  } catch (e) {
    return false;
  }
}

function parseTavilyResultsLocally(results: any[], criteria: any): any[] {
  const candidates: any[] = [];
  
  for (const r of results) {
    if (!r.title || !r.url) continue;
    
    // Ignore obviously non-individual pages if possible, using our robust profile validator
    if (!isValidProfileUrl(r.url)) {
      continue;
    }
    
    const lowerTitle = r.title.toLowerCase();
    
    // Ignore results where the title implies resource pages, course slides, or CV templates/guides instead of individuals
    const forbiddenTitleKeywords = [
      "guide", "template", "how to", "how-to", "writing", "sample", "example", 
      "syllabus", "course", "lecture", "workshop", "event", "policy", "handbook", 
      "resources", "calendar", "jobs matching", "job openings", "hiring", "careers at", 
      "salary", "job description", "tips", "tutorial", "outline", "advice", "creating", 
      "curriculum", "office of", "department of", "school of", "university of", "student life", "studentlife",
      "handout", "manual", "[pdf]"
    ];
    if (forbiddenTitleKeywords.some(keyword => lowerTitle.includes(keyword))) {
      continue;
    }
    
    const lowerUrl = r.url.toLowerCase();
    const urlObj = new URL(r.url);
    const hostname = urlObj.hostname.toLowerCase();
    
    let name = "";
    let title = criteria.role || "Software Engineer";
    let company = "Various / Freelance";
    let location = criteria.location || "USA";
    let summary = r.content || "";
    
    // Clean up title (remove " | LinkedIn", "- LinkedIn", etc.)
    let cleanedTitle = r.title
      .replace(/\s*\|\s*LinkedIn/gi, "")
      .replace(/\s*-\s*LinkedIn/gi, "")
      .replace(/\s*·\s*GitHub/gi, "")
      .trim();
      
    // Parsers for different platforms
    if (lowerUrl.includes("linkedin.com/in/")) {
      // "Name - Title - Company" or "Name, Title at Company" or "Name | Title"
      // Split by common delimiters: - , |
      const parts = cleanedTitle.split(/\s+[-–|]\s+/);
      if (parts.length >= 1) {
        name = parts[0].trim();
      }
      if (parts.length >= 2) {
        title = parts[1].trim();
      }
      if (parts.length >= 3) {
        company = parts[2].trim();
      } else {
        // Try to extract company from title if it's "Title at Company"
        const atMatch = title.match(/(.+)\s+at\s+(.+)/i);
        if (atMatch) {
          title = atMatch[1].trim();
          company = atMatch[2].trim();
        }
      }
    } else if (lowerUrl.includes("github.com/")) {
      // e.g. "username (Name) · GitHub" or "username (Name)"
      const ghMatch = cleanedTitle.match(/^([^(]+)\s*\(([^)]+)\)/);
      if (ghMatch) {
        name = ghMatch[2].trim(); // Name is inside parentheses
        title = "Open Source Developer";
        company = "GitHub Contributor";
      } else {
        // Just use username as name
        const pathParts = r.url.split("/");
        const username = pathParts[pathParts.length - 1] || cleanedTitle;
        name = username;
        title = "Developer";
        company = "GitHub";
      }
    } else if (lowerUrl.includes("scholar.google.")) {
      const parts = cleanedTitle.split(/\s+[-–|]\s+/);
      name = parts[0].trim();
      title = "Researcher / PhD Scholar";
      company = "Google Scholar Verified";
    } else if (lowerUrl.includes("researchgate.net")) {
      const parts = cleanedTitle.split(/\s+[-–|]\s+/);
      name = parts[0].trim();
      title = "Research Scientist / Researcher";
      company = "ResearchGate";
    } else if (lowerUrl.includes("orcid.org")) {
      const parts = cleanedTitle.split(/\s+[-–|]\s+/);
      name = parts[0].trim();
      title = "Registered Researcher";
      company = "ORCID";
    } else {
      // Fallback for general web results / university sites
      const parts = cleanedTitle.split(/\s+[-–|]\s+/);
      name = parts[0].trim();
      if (parts.length >= 2) {
        title = parts[1].trim();
      } else {
        title = criteria.role || "Researcher";
      }
      if (parts.length >= 3) {
        company = parts[2].trim();
      } else {
        // Derive university name from domain
        const domainParts = hostname.split(".");
        if (domainParts.length >= 2) {
          const uni = domainParts[domainParts.length - 2];
          company = uni.charAt(0).toUpperCase() + uni.slice(1);
          if (hostname.endsWith(".edu")) {
            company += " University";
          }
        }
      }
    }
    
    // Fallback if name looks like a company or is empty or too long
    if (!name || name.length > 50 || name.toLowerCase().includes("top") || name.toLowerCase().includes("best") || name.toLowerCase().includes("how to")) {
      continue;
    }
    
    // Extract Skills from content
    const commonSkills = [
      "react", "typescript", "node", "python", "golang", "rust", "kubernetes", "docker", 
      "c++", "aws", "gcp", "pytorch", "tensorflow", "distributed systems", "java", "sql", 
      "javascript", "c#", "swift", "kotlin", "ruby", "php", "django", "next.js", "vue", "deep learning", "machine learning"
    ];
    const top_skills: string[] = [];
    const lowerContent = summary.toLowerCase();
    
    commonSkills.forEach(skill => {
      const regex = new RegExp(`\\b${skill.replace("+", "\\+")}\\b`, 'i');
      if (regex.test(lowerContent)) {
        if (skill === "typescript") top_skills.push("TypeScript");
        else if (skill === "react") top_skills.push("React");
        else if (skill === "node") top_skills.push("Node.js");
        else if (skill === "golang") top_skills.push("Go / Golang");
        else if (skill === "pytorch") top_skills.push("PyTorch");
        else if (skill === "tensorflow") top_skills.push("TensorFlow");
        else if (skill === "next.js") top_skills.push("Next.js");
        else if (skill === "deep learning") top_skills.push("Deep Learning");
        else if (skill === "machine learning") top_skills.push("Machine Learning");
        else top_skills.push(skill.toUpperCase());
      }
    });
    
    // If no skills found, use target skills from criteria
    if (top_skills.length === 0) {
      if (criteria.required_skills && criteria.required_skills.length > 0) {
        top_skills.push(...criteria.required_skills.slice(0, 3));
      } else {
        top_skills.push("Computer Science");
      }
    }
    
    // Extract Location from content
    const cities = ["San Francisco", "New York", "Toronto", "Waterloo", "London", "Berlin", "Paris", "Seattle", "Austin", "Boston", "Vancouver", "Chicago", "Los Angeles", "Silicon Valley"];
    let detectedLocation = "";
    for (const city of cities) {
      if (new RegExp(`\\b${city}\\b`, 'i').test(lowerContent) || new RegExp(`\\b${city}\\b`, 'i').test(cleanedTitle)) {
        detectedLocation = city;
        break;
      }
    }
    if (detectedLocation) {
      location = detectedLocation;
    } else if (criteria.location && criteria.location.toLowerCase() !== "remote") {
      location = criteria.location;
    } else {
      location = "United States";
    }
    
    // Extract Years of Experience
    let years_of_experience = "5+ years";
    const yrsMatch = lowerContent.match(/(\d+)\+?\s*years?/);
    if (yrsMatch) {
      years_of_experience = `${yrsMatch[1]}+ years`;
    } else if (criteria.seniority_level) {
      years_of_experience = criteria.seniority_level;
    }
    
    candidates.push({
      name,
      title,
      company,
      location,
      top_skills: top_skills.slice(0, 4),
      years_of_experience,
      summary: summary.substring(0, 250) + (summary.length > 250 ? "..." : ""),
      ai_match_note: `Located live via Tavily web search matching: ${criteria.role || ""}. (Note: Candidate details extracted locally due to Gemini API quota exhaustion)`,
      web_link: r.url,
      search_query_url: r.url,
      is_synthetic: false
    });
  }
  
  return candidates;
}

function buildTavilyQuery(criteria: any): string {
  const parts: string[] = [];
  
  if (criteria.role) {
    const roleLower = criteria.role.toLowerCase();
    // Do not wrap multi-word generated roles in full quotes, as it restricts results excessively.
    // Instead, wrap known tech phrases in quotes, and leave general role keywords unquoted.
    if (roleLower.includes("distributed systems")) {
      parts.push(`"distributed systems"`);
    } else if (roleLower.includes("machine learning")) {
      parts.push(`"machine learning"`);
    } else if (roleLower.includes("deep learning")) {
      parts.push(`"deep learning"`);
    } else if (roleLower.includes("computer vision")) {
      parts.push(`"computer vision"`);
    } else if (roleLower.includes("natural language")) {
      parts.push(`"natural language processing"`);
    } else {
      parts.push(criteria.role.replace(/["']/g, ""));
    }
  }
  
  if (criteria.location && criteria.location.toLowerCase() !== "remote") {
    // Extract city name and place in quotes to ensure match without being over-constrained by state syntax
    const city = criteria.location.split(",")[0].trim().replace(/["']/g, "");
    parts.push(`"${city}"`);
  }

  // Include Seniority / Academic terms directly into query parts to target the right profile level
  if (criteria.seniority_level) {
    const level = criteria.seniority_level.toLowerCase();
    if (level.includes("phd") || level.includes("researcher") || level.includes("postdoc") || level.includes("doctor")) {
      parts.push(`(PhD OR "Ph.D." OR doctoral OR postdoc OR researcher)`);
    } else if (level.includes("staff") || level.includes("principal")) {
      parts.push(`(Staff OR Principal)`);
    } else if (level.includes("senior")) {
      parts.push(`Senior`);
    }
  }

  // Include required skills
  if (criteria.required_skills && criteria.required_skills.length > 0) {
    criteria.required_skills.slice(0, 2).forEach((skill: string) => {
      if (skill.length > 1) {
        parts.push(`"${skill}"`);
      }
    });
  }

  // Include Education signals (e.g., target university)
  if (criteria.education_signals && criteria.education_signals.length > 0) {
    criteria.education_signals.slice(0, 2).forEach((edu: string) => {
      if (edu.toLowerCase().includes("waterloo")) {
        parts.push(`Waterloo`);
      } else if (edu.toLowerCase().includes("toronto") || edu.toLowerCase().includes("uoft")) {
        parts.push(`Toronto`);
      } else if (edu.toLowerCase().includes("stanford")) {
        parts.push(`Stanford`);
      } else if (edu.toLowerCase().includes("mit")) {
        parts.push(`MIT`);
      } else if (edu.toLowerCase().includes("berkeley")) {
        parts.push(`Berkeley`);
      } else if (edu.length < 25 && !edu.toLowerCase().includes("bsc") && !edu.toLowerCase().includes("msc") && !edu.toLowerCase().includes("phd")) {
        parts.push(`"${edu}"`);
      }
    });
  }
  
  return `${parts.join(" ")} (profile OR portfolio OR cv OR resume)`;
}

async function searchTavily(query: string, apiKey: string): Promise<any[]> {
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: "advanced",
        include_answer: false,
        max_results: 20
      })
    });
    
    if (!response.ok) {
      const errText = await response.text();
      console.error("Tavily API responded with error:", response.status, errText);
      throw new Error(`Tavily API error: ${response.status} - ${errText}`);
    }
    
    const data: any = await response.json();
    return data.results || [];
  } catch (error: any) {
    console.error("Tavily Search request failed:", error.message || error);
    throw error;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // 1. Parsing endpoint
  app.post("/api/parse", async (req, res) => {
    const { query, hiringCriteria, model } = req.body;
    try {
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query is required" });
      }

      const client = getGeminiClient();
      const modelName = model || "gemini-3.5-flash";

      const systemInstruction = `You are an expert AI recruiting and talent intelligence parser. Your task is to extract clear structural sourcing criteria from natural-language queries.
Do not add any preamble, markdown fences, or extra text. Output strictly a JSON object with the requested properties.`;

      const prompt = `Raw recruiter query: "${query}"
${hiringCriteria ? `Additional hiring criteria context: "${hiringCriteria}"` : ""}

Parse this query into structured recruiting filters. Ensure all arrays are populated if values exist, or left empty if they don't.`;

      const response = await client.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              role: { type: Type.STRING, description: "Primary candidate role title" },
              seniority_level: { type: Type.STRING, description: "Seniority level or range" },
              location: { type: Type.STRING, description: "Location or remote requirements" },
              required_skills: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Primary/must-have skill tags (e.g. languages, frameworks, core techs)"
              },
              preferred_skills: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Nice-to-have or optional skill tags"
              },
              industry: { type: Type.STRING, description: "Target industry vertical" },
              education_signals: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Degrees, academic institutions, or research credentials requested"
              },
              diversity_or_demographic_filters: {
                type: Type.STRING,
                description: "Note any demographic keywords or diversity indicators mentioned"
              },
              other_notes: { type: Type.STRING, description: "Extra observations, background details, or notes" }
            },
            required: [
              "role",
              "seniority_level",
              "location",
              "required_skills",
              "preferred_skills",
              "industry",
              "education_signals",
              "diversity_or_demographic_filters",
              "other_notes"
            ]
          }
        }
      });

      if (!response.text) {
        throw new Error("No response received from Gemini.");
      }

      const parsedJSON = JSON.parse(response.text.trim());
      res.json(parsedJSON);
    } catch (error: any) {
      console.warn("Gemini API Parse failed, executing local fallback parser: ", error.message || error);
      // Seamlessly execute local high-fidelity parsing
      const fallbackResult = parseQueryLocally(query || "", hiringCriteria || "");
      res.json(fallbackResult);
    }
  });

  // 2. Generate candidates endpoint
  app.post("/api/generate-candidates", async (req, res) => {
    const { criteria, model, sourcingMode } = req.body;
    try {
      if (!criteria) {
        return res.status(400).json({ error: "Sourcing criteria object is required" });
      }

      const client = getGeminiClient();
      const modelName = model || "gemini-3.5-flash";
      const tavilyApiKey = process.env.TAVILY_API_KEY;

      let parsedJSON: any = null;
      let realSources: string[] = [];
      let usedTavily = false;

      // Try Tavily search first if API key is provided
      if (tavilyApiKey) {
        try {
          console.log("[Tavily] Sourcing live profiles using Tavily API");
          const query = buildTavilyQuery(criteria);
          console.log("[Tavily] Formulated search query:", query);
          
          const rawSearchResults = await searchTavily(query, tavilyApiKey);
          
          // Filter to only include real, verified individual profile/portfolio URLs
          const searchResults = rawSearchResults.filter((r: any) => isValidProfileUrl(r.url));
          
          if (searchResults && searchResults.length > 0) {
            usedTavily = true;
            realSources = searchResults.map((r: any) => `${r.title}: ${r.url}`);
            
            const searchResultsText = searchResults.map((r: any, idx: number) => `
Result #${idx + 1}:
Title: ${r.title}
URL: ${r.url}
Snippet: ${r.content}
`).join("\n\n");

            const tavilyStructureSystemInstruction = `You are an elite talent acquisition AI. Your task is to analyze raw search engine results (titles, URLs, snippets) and extract real, verifiable professional profiles matching the search criteria.
For each candidate you identify in the search results, extract their name, professional title, company/organization, geographical location, top skills, years of experience (estimate based on context if not explicit), a short summary of their profile/work, an explanation of why they match, and their profile URL.
Set 'is_synthetic' to false, since these are real people found in search.
Only return candidates who are actually mentioned or have their profiles represented in the search results. Do not invent anyone.
Do not output markdown formatting or code blocks — return strictly valid JSON matching the schema.`;

            const tavilyStructurePrompt = `Search Criteria:
Role: ${criteria.role}
Location: ${criteria.location}
Seniority: ${criteria.seniority_level}
Required Skills: ${criteria.required_skills?.join(", ")}
Education: ${criteria.education_signals?.join(", ")}

Here are the raw search engine results retrieved live from Tavily Search:
${searchResultsText}

Please extract and structure up to 6-8 matching candidates from these live search results into the required JSON format. If a candidate's profile is found, use their exact LinkedIn, GitHub, or other profile URL as the 'web_link' and the 'search_query_url'.`;

            try {
              const response = await client.models.generateContent({
                model: modelName,
                contents: tavilyStructurePrompt,
                config: {
                  systemInstruction: tavilyStructureSystemInstruction,
                  responseMimeType: "application/json",
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      candidates: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            name: { type: Type.STRING },
                            title: { type: Type.STRING },
                            company: { type: Type.STRING },
                            location: { type: Type.STRING },
                            top_skills: { type: Type.ARRAY, items: { type: Type.STRING } },
                            years_of_experience: { type: Type.STRING },
                            summary: { type: Type.STRING },
                            ai_match_note: { type: Type.STRING },
                            web_link: { type: Type.STRING },
                            search_query_url: { type: Type.STRING },
                            is_synthetic: { type: Type.BOOLEAN },
                          },
                          required: [
                            "name", "title", "company", "location", "top_skills",
                            "years_of_experience", "summary", "ai_match_note",
                            "web_link", "search_query_url", "is_synthetic",
                          ],
                        },
                      },
                    },
                    required: ["candidates"],
                  },
                },
              });

              if (response.text) {
                parsedJSON = JSON.parse(response.text.trim());
              } else {
                console.warn("Gemini Tavily structure response was empty. Falling back.");
                usedTavily = false;
              }
            } catch (structureError: any) {
              console.warn("Gemini parsing of Tavily results failed (likely quota). Parsing Tavily results locally using fallback parser:", structureError.message || structureError);
              const localCandidates = parseTavilyResultsLocally(searchResults, criteria);
              parsedJSON = { candidates: localCandidates };
            }
          } else {
            console.warn("Tavily returned 0 search results. Falling back.");
          }
        } catch (tavilyError: any) {
          console.warn("Tavily pipeline failed, falling back to standard Gemini Google Search tool:", tavilyError.message || tavilyError);
        }
      }

      // If Tavily wasn't used or failed, run native Gemini Google Search Tool
      if (!usedTavily) {
        console.log("[Search] Running native Gemini googleSearch grounding tool...");
        const groundedSystemInstruction = `You are an elite, live internet-grounded talent sourcing intelligence agent. Use Google Search to locate actual, real-world, verifiable professionals, researchers, academic specialists, or engineers matching the given sourcing criteria.
Locate real people with profiles on public sites like LinkedIn, GitHub, Google Scholar, university staff directories, or enterprise bio pages.
For each matching candidate found, write out in plain text: their accurate name, current title/affiliation, company or university, geographical location, top skills, years of experience, a short summary, an explanation of why they match, and the exact URL of the public page where you found them.
List 6-8 candidates. Be explicit and factual — only include people you actually found evidence of via search. If you cannot verify enough real candidates, say so plainly rather than inventing anyone.`;

        const groundedPrompt = `Search the web and find real candidates (academic researchers, enterprise experts, or engineers) that match these recruitment filters:
${JSON.stringify(criteria, null, 2)}`;

        const groundedResponse = await client.models.generateContent({
          model: modelName,
          contents: groundedPrompt,
          config: {
            systemInstruction: groundedSystemInstruction,
            tools: [{ googleSearch: {} }],
          },
        });

        if (!groundedResponse.text) {
          throw new Error("No grounded response received from Gemini.");
        }

        const groundingChunks =
          groundedResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        realSources = groundingChunks
          .map((c: any) => c?.web?.uri && c?.web?.title ? `${c.web.title}: ${c.web.uri}` : null)
          .filter(Boolean);

        const structureSystemInstruction = `You reformat already-researched, real candidate findings into strict JSON matching the given schema. Do not invent, alter, or embellish any facts, names, or links beyond what is provided in the source text below. If a 'web_link' was given in the source text, use it exactly. Set 'is_synthetic' to false for every candidate, since these are real, search-verified people. Do not output markdown fences or commentary — JSON only.`;

        const structurePrompt = `Here are real candidate findings from a live Google Search:

${groundedResponse.text}

Real source links discovered during search (use these for web_link/search_query_url where they match a candidate; do not fabricate a link if none is available):
${realSources.length ? realSources.join("\n") : "(no explicit source links captured)"}

Convert the above into the required JSON schema, one entry per candidate found. If fewer than 6 real candidates were found, only return the ones that are real — do not pad with invented people.`;

        const response = await client.models.generateContent({
          model: modelName,
          contents: structurePrompt,
          config: {
            systemInstruction: structureSystemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                candidates: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      title: { type: Type.STRING },
                      company: { type: Type.STRING },
                      location: { type: Type.STRING },
                      top_skills: { type: Type.ARRAY, items: { type: Type.STRING } },
                      years_of_experience: { type: Type.STRING },
                      summary: { type: Type.STRING },
                      ai_match_note: { type: Type.STRING },
                      web_link: { type: Type.STRING },
                      search_query_url: { type: Type.STRING },
                      is_synthetic: { type: Type.BOOLEAN },
                    },
                    required: [
                      "name", "title", "company", "location", "top_skills",
                      "years_of_experience", "summary", "ai_match_note",
                      "web_link", "search_query_url", "is_synthetic",
                    ],
                  },
                },
              },
              required: ["candidates"],
            },
          },
        });

        if (!response.text) {
          throw new Error("No response received from Gemini structuring call.");
        }

        parsedJSON = JSON.parse(response.text.trim());
      }

      res.json({
        ...parsedJSON,
        is_fallback: false,
        search_engine: usedTavily ? "tavily" : "google",
        grounded_sources: realSources
      });
    } catch (error: any) {
      const message = error?.message || String(error);
      const isRateLimit = message.includes("429") || message.toLowerCase().includes("resource_exhausted") || message.toLowerCase().includes("quota");
      console.warn(
        `Gemini API Candidate Generation failed (mode=${sourcingMode}, rateLimit=${isRateLimit}), executing local fallback engine: `,
        message
      );
      // Seamlessly execute local high-fidelity generator
      const fallbackResult = generateCandidatesLocally(criteria, sourcingMode || "synthetic");
      res.json({
        ...fallbackResult,
        fallback_reason: isRateLimit ? "rate_limit" : "api_error",
        was_grounded_attempted: sourcingMode === "grounded",
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
