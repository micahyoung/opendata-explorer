import { z } from "zod";

export const credentialsSchema = z.object({
  provider: z.string(),
  baseURL: z.string().url(),
  apiKey: z.string().min(1),
  model: z.string().min(1),
  socrataAppTokens: z.record(z.string(), z.string()).optional(),
});
export type Credentials = z.infer<typeof credentialsSchema>;
