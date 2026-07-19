import { promises as fs } from "node:fs";
import { runScrapePipeline, SCRAPER_COUNT } from "../lib/pipeline";

async function writeStepSummary(result: Awaited<ReturnType<typeof runScrapePipeline>>) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;

  const lines = [
    "## Scrape summary",
    "",
    `- Found: ${result.found.length}`,
    `- Saved: ${result.saved.length}`,
    `- Failures: ${result.failures.length}`
  ];

  if (result.failures.length > 0) {
    lines.push("", "| Scraper | Error |", "| --- | --- |");
    for (const failure of result.failures) {
      lines.push(`| ${failure.scraper} | ${failure.message.replace(/\|/g, "\\|")} |`);
    }
  }

  await fs.appendFile(summaryPath, `${lines.join("\n")}\n`, "utf8");
}

async function main() {
  const result = await runScrapePipeline();

  console.log(`Scrape complete`);
  console.log(`Found: ${result.found.length}`);
  console.log(`Saved: ${result.saved.length}`);

  if (result.failures.length > 0) {
    console.log(`Failures: ${result.failures.length}`);
    for (const failure of result.failures) {
      console.log(`- ${failure.scraper}: ${failure.message}`);
    }
  }

  await writeStepSummary(result);

  if (result.failures.length === SCRAPER_COUNT) {
    console.error("All scrapers failed.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
