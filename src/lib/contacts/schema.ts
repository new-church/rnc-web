import { z } from "zod";

export const contactAddressSchema = z.object({
  line1: z.string().optional().default(""),
  line2: z.string().optional().default(""),
  city: z.string().optional().default(""),
  state: z.string().optional().default(""),
  postalCode: z.string().optional().default(""),
  country: z.string().optional().default("AU"),
});

export const contactDataSchema = z.object({
  displayName: z.string().min(1, "Name is required"),
  email: z
    .string()
    .trim()
    .optional()
    .default("")
    .refine((v) => !v || z.string().email().safeParse(v).success, {
      message: "Valid email required",
    }),
  phone: z.string().optional().default(""),
  address: contactAddressSchema.optional().default({
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "AU",
  }),
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().optional().default(""),
  mailchimpSyncedAt: z.string().nullable().optional().default(null),
  postgridSyncedAt: z.string().nullable().optional().default(null),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type ContactAddress = z.infer<typeof contactAddressSchema>;
export type ContactData = z.infer<typeof contactDataSchema>;

/** Sort key fragment: "lastname firstname" for directory GSI. */
export function sortNameFromDisplayName(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "unknown";
  if (parts.length === 1) return parts[0]!.toLowerCase();
  const last = parts[parts.length - 1]!;
  const first = parts.slice(0, -1).join(" ");
  return `${last} ${first}`.toLowerCase();
}
