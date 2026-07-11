import { z } from "zod";
import { APPLICATION_STATUSES, APPLICATION_PLATFORMS, FOLLOWUP_STATUSES, CONTACT_STATUSES } from "@/lib/types";

export const applicationCreateSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  role_title: z.string().min(1, "Role title is required"),
  platform: z.enum(APPLICATION_PLATFORMS).optional().nullable(),
  application_url: z.string().optional().nullable(),
  contact_id: z.string().uuid().optional().nullable(),
  job_description_text: z.string().optional().nullable(),
  followup_status: z.enum(FOLLOWUP_STATUSES).optional().nullable(),
  status: z.enum(APPLICATION_STATUSES).optional(),
  date_applied: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  notes: z.string().optional().nullable(),
});

export const applicationUpdateSchema = applicationCreateSchema.partial();

export const applicationStatusSchema = z.object({
  status: z.enum(APPLICATION_STATUSES),
});

export const contactCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company_name: z.string().optional().nullable(),
  role_title: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  linkedin_url: z.string().url().optional().nullable().or(z.literal("")),
  status: z.enum(CONTACT_STATUSES).optional(),
  application_id: z.string().uuid().optional().nullable(),
});

export const contactUpdateSchema = contactCreateSchema.partial();

export const weeklyGoalSchema = z.object({
  week_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  target_applications: z.number().int().min(0),
  target_interviews: z.number().int().min(0),
});

export type ApplicationCreateInput = z.infer<typeof applicationCreateSchema>;
export type ApplicationUpdateInput = z.infer<typeof applicationUpdateSchema>;
export type ContactCreateInput = z.infer<typeof contactCreateSchema>;
export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>;
export type WeeklyGoalInput = z.infer<typeof weeklyGoalSchema>;
