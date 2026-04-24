export const BUSINESS_CATEGORIES = [
  "Hair Salon",
  "Barber",
  "Beauty Salon",
  "Nail Technician",
  "Massage Therapist",
  "Physiotherapy",
  "Other",
] as const;

export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];

export type ServiceDraft = {
  name: string;
  duration_minutes: number;
  price: number;
};

export type WeeklyHours = {
  mon: { enabled: boolean; start: string; end: string };
  tue: { enabled: boolean; start: string; end: string };
  wed: { enabled: boolean; start: string; end: string };
  thu: { enabled: boolean; start: string; end: string };
  fri: { enabled: boolean; start: string; end: string };
  sat: { enabled: boolean; start: string; end: string };
  sun: { enabled: boolean; start: string; end: string };
};

export const DEFAULT_WEEKLY_HOURS: WeeklyHours = {
  mon: { enabled: true, start: "09:00", end: "18:00" },
  tue: { enabled: true, start: "09:00", end: "18:00" },
  wed: { enabled: true, start: "09:00", end: "18:00" },
  thu: { enabled: true, start: "09:00", end: "18:00" },
  fri: { enabled: true, start: "09:00", end: "18:00" },
  sat: { enabled: true, start: "09:00", end: "16:00" },
  sun: { enabled: false, start: "09:00", end: "16:00" },
};

export const SERVICE_PRESETS: Record<BusinessCategory, ServiceDraft[]> = {
  "Hair Salon": [
    { name: "Haircut", duration_minutes: 45, price: 35 },
    { name: "Blow dry", duration_minutes: 30, price: 25 },
    { name: "Colour", duration_minutes: 90, price: 80 },
  ],
  Barber: [
    { name: "Haircut", duration_minutes: 30, price: 25 },
    { name: "Skin fade", duration_minutes: 40, price: 30 },
    { name: "Beard trim", duration_minutes: 20, price: 15 },
  ],
  "Beauty Salon": [
    { name: "Facial", duration_minutes: 60, price: 65 },
    { name: "Waxing", duration_minutes: 30, price: 30 },
    { name: "Makeup", duration_minutes: 60, price: 70 },
  ],
  "Nail Technician": [
    { name: "Gel manicure", duration_minutes: 45, price: 35 },
    { name: "BIAB", duration_minutes: 60, price: 45 },
    { name: "Pedicure", duration_minutes: 45, price: 35 },
  ],
  "Massage Therapist": [
    { name: "Back massage", duration_minutes: 30, price: 40 },
    { name: "Deep tissue massage", duration_minutes: 60, price: 70 },
    { name: "Sports massage", duration_minutes: 60, price: 75 },
  ],
  Physiotherapy: [
    { name: "Initial assessment", duration_minutes: 60, price: 85 },
    { name: "Follow-up session", duration_minutes: 45, price: 65 },
    { name: "Rehab plan", duration_minutes: 30, price: 50 },
  ],
  Other: [
    { name: "Consultation", duration_minutes: 30, price: 30 },
    { name: "Standard appointment", duration_minutes: 45, price: 45 },
    { name: "Extended appointment", duration_minutes: 60, price: 60 },
  ],
};
