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
    try {
      const { query, hiringCriteria, model } = req.body;
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
      console.error("Parsing endpoint error:", error);
      res.status(500).json({ error: error.message || "Failed to parse candidate criteria" });
    }
  });

  // 2. Generate candidates endpoint
  app.post("/api/generate-candidates", async (req, res) => {
    try {
      const { criteria, model } = req.body;
      if (!criteria) {
        return res.status(400).json({ error: "Sourcing criteria object is required" });
      }

      const client = getGeminiClient();
      const modelName = model || "gemini-3.5-flash";

      const systemInstruction = `You are a premium, professional AI talent sourcing agent. Your task is to generate 6 to 8 realistic but strictly synthetic, fictional candidate profiles matching the provided recruiting filters.
These candidates will be used for UI prototyping and concept verification. Avoid generic placeholder names; generate realistic candidate profiles of people who would live in the specified locations and work at actual top-tier tech/fintech/infrastructure companies (e.g. Shopify, Huawei, TD, Cohere, Amazon, etc.).
Ensure you provide a creative 'ai_match_note' for each candidate describing precisely how their qualifications line up with the specific filters requested.
Do not add any preamble or markdown fences. Output strictly a JSON object with a single 'candidates' list containing the profile objects.`;

      const prompt = `Generate 6-8 synthetic candidate profiles for UI testing that fit the following criteria:
${JSON.stringify(criteria, null, 2)}`;

      const response = await client.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              candidates: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: "Full name" },
                    title: { type: Type.STRING, description: "Current professional title" },
                    company: { type: Type.STRING, description: "Current company" },
                    location: { type: Type.STRING, description: "Geographical location" },
                    top_skills: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "List of 3 top relevant skills"
                    },
                    years_of_experience: { type: Type.STRING, description: "Years of experience" },
                    summary: { type: Type.STRING, description: "1-line professional resume summary/elevator pitch" },
                    ai_match_note: { type: Type.STRING, description: "Custom note explaining why this person matches the parsed parameters perfectly" }
                  },
                  required: [
                    "name",
                    "title",
                    "company",
                    "location",
                    "top_skills",
                    "years_of_experience",
                    "summary",
                    "ai_match_note"
                  ]
                }
              }
            },
            required: ["candidates"]
          }
        }
      });

      if (!response.text) {
        throw new Error("No response received from Gemini.");
      }

      const parsedJSON = JSON.parse(response.text.trim());
      res.json(parsedJSON);
    } catch (error: any) {
      console.error("Candidate generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate candidates" });
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
