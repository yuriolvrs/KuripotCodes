import { runScrapePipeline } from "../lib/pipeline";

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
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
