import { z } from "zod";
import { sanitiseInput, sanitiseLongText } from "./sanitise";

const saPhone = /^(\+27|0)[6-8][0-9]{8}$/;
const time24h = /^([01]\d|2[0-3]):[0-5]\d$/;

const clean = (max = 500) => z.string().transform((value) => sanitiseInput(value).slice(0, max));
const cleanOptional = (max = 500) => z.string().optional().nullable().transform((value) => sanitiseInput(value ?? "").slice(0, max));
const cleanPhone = z.string().transform((value) => sanitiseInput(value).replace(/[\s().-]/g, "").slice(0, 20));

export const BookingInput = z.object({
  service_type: clean(60).pipe(z.string().min(2).max(60)),
  home_size: clean(40).pipe(z.string().min(2).max(40)),
  address: clean(500).pipe(z.string().min(10, "Enter a complete service address").max(500)),
  date: clean(20).pipe(z.string().min(8).max(20)),
  time: clean(10).pipe(z.string().regex(time24h, "Choose a valid time slot")),
  extras: z.array(clean(80).pipe(z.string().max(80))).max(20).default([]),
});

export const SupportCaseInput = z.object({
  category: clean(180).pipe(z.string().min(2, "Add a support subject").max(180)),
  description: z.string().transform((value) => sanitiseLongText(value, 2000)).pipe(
    z.string().min(20, "Tell us a little more so support can help").max(2000),
  ),
  booking_id: cleanOptional(80).pipe(z.string().max(80)).optional(),
});

export const ZooterApplicationInput = z.object({
  full_name: clean(120).pipe(z.string().min(2, "Enter your full name").max(120)),
  phone: cleanPhone.pipe(z.string().regex(saPhone, "Enter a valid South African phone number")),
  suburb: clean(80).pipe(z.string().min(2, "Enter your suburb").max(80)),
  years_experience: z.coerce.number().min(0).max(60),
});

export const ProfileUpdateInput = z.object({
  full_name: clean(120).pipe(z.string().min(2, "Enter your full name").max(120)),
  phone: cleanPhone.pipe(z.string().regex(saPhone, "Enter a valid South African phone number").or(z.literal(""))),
  address: cleanOptional(500).pipe(z.string().max(500)).optional(),
});
