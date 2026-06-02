import { loadConfig } from "./config.js";
import { loadPrompts, loadReviewSpec, loadStandards } from "./files.js";
import {
  createGitHubClient,
  createPullRequestReview,
  fetchPullRequestFiles,
  formatReviewBody,
  parseRepository
} from "./github.js";
import { reviewPullRequest } from "./claude-reviewer.js";

// Main orchestration function:
// 1. Read configuration.
// 2. Fetch changed PR files.
// 3. Ask Claude to inspect the diff against the review spec.
// 4. Post the decision back to GitHub.
async function main() {
  const config = loadConfig();

  // PR_NUMBER is required because the GitHub API needs to know which PR to read.
  if (config.pullNumber <= 0) {
    throw new Error("PR_NUMBER must be set to the pull request number.");
  }

  // Prepare GitHub repository details and authenticated API client.
  const repoRef = parseRepository(config.repository);
  const octokit = createGitHubClient(config.githubToken);

  // These operations are independent, so we load them in parallel:
  // prompt files, review spec, company standards, and changed PR files.
  const [prompts, reviewSpec, standards, files] = await Promise.all([
    loadPrompts(),
    loadReviewSpec(),
    loadStandards(),
    fetchPullRequestFiles(octokit, repoRef, config.pullNumber)
  ]);

  // Ask Claude to review the PR and return structured JSON.
  const result = await reviewPullRequest({
    model: config.model,
    apiKey: config.anthropicApiKey,
    prompts,
    reviewSpec,
    standards,
    files
  });

  // Print the same Markdown that will be posted to GitHub.
  // This helps during local debugging or DRY_RUN mode.
  const body = formatReviewBody(result, config.rejectScoreThreshold);
  console.log(body);

  // DRY_RUN lets you test the agent without creating a real PR review.
  if (config.dryRun) {
    console.log("DRY_RUN=true; skipping GitHub review submission.");
    return;
  }

  // Submit APPROVE or REQUEST_CHANGES to the pull request.
  await createPullRequestReview(
    octokit,
    repoRef,
    config.pullNumber,
    result,
    config.rejectScoreThreshold
  );
}

// Make failures visible in GitHub Actions and local terminal runs.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
