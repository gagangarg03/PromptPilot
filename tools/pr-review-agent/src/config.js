// Reads all settings needed by the PR review agent from environment variables.
// In GitHub Actions, most of these values come from the workflow file.
export function loadConfig() {
  return {
    // Token used by Octokit to read PR files and submit the review.
    githubToken: required("GITHUB_TOKEN"),

    // Repository name in "owner/repo" format, for example "my-company/api".
    repository: required("GITHUB_REPOSITORY"),

    // Pull request number that should be reviewed.
    pullNumber: numberFromEnv("PR_NUMBER", 0),

    // API key used to call Claude for the actual code inspection.
    anthropicApiKey: required("ANTHROPIC_API_KEY"),

    // Model can be changed from the workflow without editing code.
    model: process.env.CLAUDE_MODEL ?? "claude-sonnet-4-20250514",

    // Any score below this number will request changes, even if verdict is APPROVE.
    rejectScoreThreshold: numberFromEnv("REJECT_SCORE_THRESHOLD", 70),

    // When true, the agent prints the review result but does not post to GitHub.
    dryRun: process.env.DRY_RUN === "true"
  };
}

// Helper for environment variables that must exist.
function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Helper for environment variables that should be numbers.
// The fallback is used when the variable is not provided.
function numberFromEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Environment variable ${name} must be a number.`);
  }

  return parsed;
}
