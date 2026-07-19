import { describe, expect, it } from "vitest";
import { parseRedditRss } from "../reddit";

function buildFeed(entries: string[]) {
  return `<?xml version="1.0" encoding="UTF-8"?><feed xmlns="http://www.w3.org/2005/Atom">${entries.join(
    ""
  )}</feed>`;
}

function buildEntry({ title, content, link }: { title: string; content: string; link: string }) {
  const escapedContent = content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<entry><title>${title}</title><content type="html">${escapedContent}</content><link href="${link}" /></entry>`;
}

describe("parseRedditRss", () => {
  it("extracts title, decoded content, and link from an entry", () => {
    const xml = buildFeed([
      buildEntry({
        title: "Angkas ANGKAS50X promo code",
        content: "<div><p>Use code ANGKAS50X for 50% off your first ride</p></div>",
        link: "https://old.reddit.com/r/Philippines/comments/abc123/angkas_promo/"
      })
    ]);

    const [entry] = parseRedditRss(xml);
    expect(entry.title).toBe("Angkas ANGKAS50X promo code");
    expect(entry.content).toBe("Use code ANGKAS50X for 50% off your first ride");
    expect(entry.link).toBe("https://old.reddit.com/r/Philippines/comments/abc123/angkas_promo/");
  });

  it("parses multiple entries", () => {
    const xml = buildFeed([
      buildEntry({ title: "Post one", content: "<p>hello</p>", link: "https://old.reddit.com/1" }),
      buildEntry({ title: "Post two", content: "<p>world</p>", link: "https://old.reddit.com/2" })
    ]);
    expect(parseRedditRss(xml)).toHaveLength(2);
  });

  it("returns an empty array for a feed with no entries", () => {
    expect(parseRedditRss(buildFeed([]))).toHaveLength(0);
  });

  it("decodes HTML entities in the title", () => {
    const xml = buildFeed([
      buildEntry({ title: "Grab &amp; Angkas deals", content: "<p>x</p>", link: "https://old.reddit.com/3" })
    ]);
    expect(parseRedditRss(xml)[0].title).toBe("Grab & Angkas deals");
  });
});
