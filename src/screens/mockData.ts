import type { StatusType } from "../components/feedback/StatusDot";

export interface AgentMock {
  id: string;
  name: string;
  type: "opencode" | "claude" | "codex";
  status: StatusType;
  statusLabel: string;
  currentTask: string;
  lastActivity: string;
  workingDirectory: string;
  branch: string;
}

export interface LogEntryMock {
  id: string;
  timestamp: string;
  agentName: string;
  agentType: "opencode" | "claude" | "codex";
  level: "info" | "error" | "success";
  message: string;
}

export interface SettingItemMock {
  id: string;
  label: string;
  value?: string;
  hasToggle?: boolean;
  toggleValue?: boolean;
}

export const mockAgents: AgentMock[] = [
  {
    id: "agent-1",
    name: "OpenCode",
    type: "opencode",
    status: "running",
    statusLabel: "Running",
    currentTask: "Refactoring auth module",
    lastActivity: "2m ago",
    workingDirectory: "~/projects/webapp",
    branch: "feature/auth-refactor",
  },
  {
    id: "agent-2",
    name: "Claude Code",
    type: "claude",
    status: "warning",
    statusLabel: "Needs Approval",
    currentTask: "Creating API endpoints",
    lastActivity: "5m ago",
    workingDirectory: "~/projects/api-server",
    branch: "feat/v2-endpoints",
  },
  {
    id: "agent-3",
    name: "Codex",
    type: "codex",
    status: "success",
    statusLabel: "Completed",
    currentTask: "Writing test suite",
    lastActivity: "12m ago",
    workingDirectory: "~/projects/cli-tool",
    branch: "test/coverage",
  },
  {
    id: "agent-4",
    name: "OpenCode",
    type: "opencode",
    status: "error",
    statusLabel: "Failed",
    currentTask: "Database migration",
    lastActivity: "18m ago",
    workingDirectory: "~/projects/backend",
    branch: "migrate/pg-16",
  },
  {
    id: "agent-5",
    name: "Claude Code",
    type: "claude",
    status: "idle",
    statusLabel: "Idle",
    currentTask: "Waiting for input",
    lastActivity: "1h ago",
    workingDirectory: "~/projects/docs",
    branch: "docs/update-readme",
  },
];

export const mockLogs: LogEntryMock[] = [
  {
    id: "log-1",
    timestamp: "14:32:01",
    agentName: "OpenCode",
    agentType: "opencode",
    level: "info",
    message: "Reading file: src/auth/session.ts",
  },
  {
    id: "log-2",
    timestamp: "14:32:03",
    agentName: "OpenCode",
    agentType: "opencode",
    level: "info",
    message: "Analyzing dependencies in auth module",
  },
  {
    id: "log-3",
    timestamp: "14:32:05",
    agentName: "Claude Code",
    agentType: "claude",
    level: "warning",
    message: "Approval needed: modify src/api/users.ts",
  },
  {
    id: "log-4",
    timestamp: "14:31:58",
    agentName: "Codex",
    agentType: "codex",
    level: "success",
    message: "Test suite passed: 142 tests, 0 failures",
  },
  {
    id: "log-5",
    timestamp: "14:31:45",
    agentName: "OpenCode",
    agentType: "opencode",
    level: "error",
    message: "Failed to connect: database/pg-16 migration error",
  },
  {
    id: "log-6",
    timestamp: "14:30:22",
    agentName: "Claude Code",
    agentType: "claude",
    level: "info",
    message: "Created file: src/api/v2/endpoints/users.ts",
  },
  {
    id: "log-7",
    timestamp: "14:30:10",
    agentName: "Codex",
    agentType: "codex",
    level: "info",
    message: "Running test: src/__tests__/cli.test.ts",
  },
  {
    id: "log-8",
    timestamp: "14:29:55",
    agentName: "OpenCode",
    agentType: "opencode",
    level: "info",
    message: "Starting task: refactoring auth module",
  },
  {
    id: "log-9",
    timestamp: "14:28:30",
    agentName: "Claude Code",
    agentType: "claude",
    level: "error",
    message: "Type error in src/api/handler.ts:42 - missing return type",
  },
  {
    id: "log-10",
    timestamp: "14:27:15",
    agentName: "Codex",
    agentType: "codex",
    level: "success",
    message: "Coverage increased: 78% -> 85%",
  },
];

export const mockSettings: SettingItemMock[] = [
  { id: "s1", label: "Default Agent", value: "OpenCode" },
  { id: "s2", label: "Notifications", hasToggle: true, toggleValue: true },
  { id: "s3", label: "Haptic Feedback", hasToggle: true, toggleValue: true },
  { id: "s4", label: "Auto-approve Actions", hasToggle: true, toggleValue: false },
  { id: "s5", label: "Theme", value: "Dark" },
  { id: "s6", label: "Log Retention", value: "7 days" },
  { id: "s7", label: "API Key", value: "••••••••" },
  { id: "s8", label: "About", value: "v1.0.0" },
];
