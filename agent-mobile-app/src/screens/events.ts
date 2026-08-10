import type { StatusType } from "../components/feedback/StatusDot";

export interface PulseEvent {
  id: string;
  type: string;
  title: string;
  summary: string;
  status: StatusType;
  statusLabel: string;
  detail: string;
  actions: { label: string; variant: "primary" | "secondary" | "ghost"; alert: string }[];
}

export const PULSE_EVENTS: PulseEvent[] = [
  {
    id: "migration",
    type: "ACTION",
    title: "Review the auth migration",
    summary: "Session handling is done — one migration is blocking tomorrow's deploy.",
    status: "warning",
    statusLabel: "Needs you",
    detail:
      "Session handling is done and tested. One database migration still needs your eyes before I push it — it touches the sessions table and blocks tomorrow's deploy. I can roll it back if you'd rather wait.",
    actions: [
      { label: "Review the migration", variant: "primary", alert: "Open Talk with migration context" },
      { label: "Pause", variant: "ghost", alert: "Paused" },
    ],
  },
  {
    id: "calendar",
    type: "CALENDAR",
    title: "3pm with Mei moved to 4",
    summary: "Confirmed with her assistant.",
    status: "success",
    statusLabel: "Confirmed",
    detail:
      "Her assistant moved the call from 3pm to 4pm. I confirmed on your behalf and added 30 minutes of buffer before it.",
    actions: [
      { label: "See the updated day", variant: "ghost", alert: "Calendar" },
    ],
  },
  {
    id: "subscription",
    type: "SUBSCRIPTION",
    title: "Coffee subscription renews Friday",
    summary: "Same plan as last month, $18.",
    status: "success",
    statusLabel: "Let through",
    detail:
      "Same plan as last month, $18, renews Friday. I let it through since it matches your usual plan.",
    actions: [
      { label: "Change plan", variant: "ghost", alert: "Subscriptions" },
    ],
  },
  {
    id: "email",
    type: "DRAFT",
    title: "Reply to the recruiter",
    summary: "Drafted — want to look before I send?",
    status: "idle",
    statusLabel: "Draft",
    detail:
      "I drafted a reply declining for now but staying in touch. Want to look before I send?",
    actions: [
      { label: "See the draft", variant: "primary", alert: "Open Talk with draft context" },
      { label: "Send it", variant: "secondary", alert: "Sent" },
    ],
  },
];

export const PULSE_SECTIONS: { label: string; eventIds: string[] }[] = [
  { label: "Needs you", eventIds: ["migration"] },
  { label: "Today", eventIds: ["calendar", "subscription", "email"] },
];
