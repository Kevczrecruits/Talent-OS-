import type { VercelRequest, VercelResponse } from "@vercel/node";
import { checkPasscode, handleParse } from "./_lib";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!checkPasscode(req.headers)) {
    return res.status(401).json({ error: "Invalid or missing passcode." });
  }
  const result = await handleParse(req.body);
  return res.status(result.status).json(result.json);
}
