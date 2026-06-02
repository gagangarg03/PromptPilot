import { Octokit } from "@octokit/rest";

// GitHub Actions provides GITHUB_REPOSITORY as "owner/repo".
// This function turns that string into the object shape Octokit expects.
export function parseRepository(repository) {
  const [owner, repo] = repository.split("/");
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY value: ${repository}`);
  }

  return { owner, repo };
}

// Creates the GitHub API client. Octokit handles authentication headers,
// pagination helpers, and REST API calls for us.
export function createGitHubClient(githubToken) {
  return new Octokit({ auth: githubToken });
}

// Downloads the list of files changed in the PR.
// GitHub gives us filename, status, and a patch/diff for text files.
export async function fetchPullRequestFiles(octokit, repoRef, pullNumber) {
  // paginate() is used because large PRs can span multiple GitHub API pages.
  const files = await octokit.paginate(octokit.pulls.listFiles, {
    owner: repoRef.owner,
    repo: repoRef.repo,
    pull_number: pullNumber,
    per_page: 100
  });

  // Keep only the fields the LLM reviewer needs.
  return files.map((file) => ({
    filename: file.filename,
    patch: file.patch,
    status: file.status
  }));
}

// Posts the final review decision back to the pull request.
// GitHub accepts APPROVE or REQUEST_CHANGES as review events.
export async function createPullRequestReview(
  octokit,
  repoRef,
  pullNumber,
  result,
  rejectScoreThreshold
) {
  // Reject when the model explicitly rejects the PR, or when the score is
  // below your configured company threshold.
  const event =
    result.verdict === "REJECT" || result.score < rejectScoreThreshold
      ? "REQUEST_CHANGES"
      : "APPROVE";

  // GitHub review body is Markdown, so humans can read it directly in the PR.
  const body = formatReviewBody(result, rejectScoreThreshold);

  await octokit.pulls.createReview({
    owner: repoRef.owner,
    repo: repoRef.repo,
    pull_number: pullNumber,
    event,
    body
  });
}

// Converts the structured JSON result from the LLM into a Markdown review.
export function formatReviewBody(result, rejectScoreThreshold) {
  // Spec checks are high-level pass/fail sections from specs/review-spec.md.
  const specChecks = result.specChecks
    .map((item) => `- ${item.id}: ${item.status} - ${item.reason}`)
    .join("\n");

  // Comments are specific findings that point to a file and line.
  const comments =
    result.comments.length === 0
      ? "No blocking line-level findings."
      : result.comments
          .map(
            (comment) =>
              `- ${comment.severity.toUpperCase()} ${comment.file}:${comment.line} [${comment.specId}] - ${comment.issue}\n  Suggestion: ${comment.suggestion}`
          )
          .join("\n");

  // The returned string is what appears in the GitHub PR review.
  return [
    "## Claude Spec-Driven PR Review",
    "",
    `Decision: **${result.verdict}**`,
    `Score: **${result.score}/100**`,
    `Reject threshold: **${rejectScoreThreshold}**`,
    "",
    "### Spec Checks",
    specChecks || "No spec checks returned.",
    "",
    "### Reasoning",
    result.summary,
    "",
    "### Findings",
    comments
  ].join("\n");
}
