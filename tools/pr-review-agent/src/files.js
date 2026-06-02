import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const agentRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

// Small wrapper so all text-file reads use the same UTF-8 behavior.
export async function readText(path) {
  return readFile(path, "utf8");
}

// Loads every review prompt from the prompts folder and combines them into
// one system instruction for the LLM.
export async function loadPrompts() {
  const promptDir = join(agentRoot, "prompts");

  // Each file is a separate inspection area. Add more files here when you
  // introduce new inspectors such as database.md or frontend.md.
  const files = ["reviewer.md", "security.md", "performance.md", "architecture.md", "tests.md"];

  const contents = await Promise.all(
    files.map(async (file) => {
      const body = await readText(join(promptDir, file));

      // Prefixing each prompt with its filename helps the model understand
      // where each set of instructions came from.
      return `# ${file}\n${body}`;
    })
  );

  // Blank lines keep the prompt readable when all files are merged.
  return contents.join("\n\n");
}

// Loads company-specific standards. This is where your team's rules,
// architecture boundaries, testing expectations, and coding style should live.
export async function loadStandards() {
  return readText(join(agentRoot, "standards", "repository-standards.md"));
}

// Loads the spec that defines what a good PR review should check.
// This is the main "spec driven" part: Claude is not just asked to review
// generally, it is asked to compare the PR against this written contract.
export async function loadReviewSpec() {
  return readText(join(agentRoot, "specs", "review-spec.md"));
}
