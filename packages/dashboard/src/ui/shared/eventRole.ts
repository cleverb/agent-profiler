/**
 * Map raw event roles from the API to timeline CSS classes.
 */
import type { TimelineRole } from "./timelineRoles.js";

export function eventRoleToTimelineClass(role: string): TimelineRole {
  if (role === "user_prompt") return "user";
  if (
    role === "assistant_message" ||
    role === "assistant_delta" ||
    role === "assistant"
  )
    return "assistant";
  if (role.startsWith("tool_")) return "tool";
  if (role.startsWith("shell_")) return "shell";
  return "other";
}
