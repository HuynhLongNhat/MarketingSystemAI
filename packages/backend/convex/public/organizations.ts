
import { v } from "convex/values";
import { action } from "../_generated/server";

export const validate = action({
  args: {
    organizationId: v.string(),
  },
  handler: async (_, args) => {
    if (!args.organizationId.trim()) {
      return {
        valid: false,
        reason: "Organization ID is required",
      };
    }

    return {
      valid: false,
      reason:
        "Organization validation is not available in the legacy Convex backend. Use Better Auth organization validation through the API.",
    };
  },
});
