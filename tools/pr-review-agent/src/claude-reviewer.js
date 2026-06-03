import Anthropic from "@anthropic-ai/sdk";

// This schema describes the final review object we want Claude to produce.
// We pass it as a forced Claude tool input schema, so Claude returns structured
// data instead of free-form prose.
const reviewSchema = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "score", "summary", "specChecks", "comments"],
  properties: {
    verdict: {
      type: "string",
      enum: ["APPROVE", "REJECT"],
      description: "Final PR decision. Use REJECT when any required spec check fails."
    },
    score: {
      type: "integer",
      description: "Overall review score from 0 to 100."
    },
    summary: {
      type: "string",
      description: "Short human-readable explanation of the decision."
    },
    specChecks: {
      type: "array",
      description: "Pass/fail result for each important requirement from the review spec.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "status", "reason"],
        properties: {
          id: {
            type: "string",
            description: "Spec requirement id, for example SEC-001 or TEST-001."
          },
          status: {
            type: "string",
            enum: ["PASS", "FAIL", "NOT_APPLICABLE"]
          },
          reason: {
            type: "string",
            description: "Why this spec check passed, failed, or was not applicable."
          }
        }
      }
    },
    comments: {
      type: "array",
      description: "Specific review comments for changed files.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["file", "line", "severity", "issue", "suggestion", "specId"],
        properties: {
          file: {
            type: "string",
            description: "Changed file path where the issue appears."
          },
          line: {
            type: "integer",
            description: "Best-effort changed line number. Use 1 if the line is unknown."
          },
          severity: {
            type: "string",
            enum: ["blocker", "warning", "info"]
          },
          issue: {
            type: "string",
            description: "What is wrong."
          },
          suggestion: {
            type: "string",
            description: "Concrete fix suggestion."
          },
          specId: {
            type: "string",
            description: "The spec requirement id this comment relates to."
          }
        }
      }
    }
  }
};

// Sends the prompts, company standards, spec, and PR diff to Claude.
export async function reviewPullRequest(input) {
  const client = new Anthropic({ apiKey: input.apiKey });

  const message = await client.messages.create({
    model: input.model,
    max_tokens: 4096,
    temperature: 0,
    system: input.prompts,
    messages: [
      {
        role: "user",
        content: buildReviewRequest(input.standards, input.reviewSpec, input.files)
      }
    ],
    tools: [
      {
        name: "submit_spec_review",
        description: "Submit the final spec-driven PR review result.",
        input_schema: reviewSchema
      }
    ],
    // Force Claude to return the structured review through this tool.
    tool_choice: {
      type: "tool",
      name: "submit_spec_review"
    }
  });

  const toolUse = message.content.find(
    (block) => block.type === "tool_use" && block.name === "submit_spec_review"
  );

  if (!toolUse) {
    throw new Error("Claude response did not include the submit_spec_review tool result.");
  }

  return toolUse.input;
}

// Builds the PR-specific message sent to Claude.
function buildReviewRequest(standards, reviewSpec, files) {
  const diff = files
    .map((file) => {
      const patch = file.patch ?? "[No patch available. File may be binary or too large.]";
      return `## ${file.filename} (${file.status})\n\n\`\`\`diff\n${patch}\n\`\`\``;
    })
    .join("\n\n");

  return [
    "Review this pull request using Spec Driven Review.",
    "",
    "Your job is to compare the PR diff against the review spec and company standards.",
    "Use the submit_spec_review tool exactly once with the final result.",
    "",
    "# Review Spec",
    reviewSpec,
    "",
    "# Company Standards",
    standards,
    "",
    "# Pull Request Diff",
    diff
  ].join("\n");
}
