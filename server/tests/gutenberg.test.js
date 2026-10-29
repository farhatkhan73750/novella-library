import { describe, it, expect } from "@jest/globals";
import { stripGutenberg, splitChapters, splitBySize } from "../src/seed/gutenbergParser.js";

const filler = (n) => "Lorem ipsum dolor sit amet. ".repeat(n).trim();

describe("stripGutenberg", () => {
  it("removes the license header and footer and normalises line endings", () => {
    const raw =
      "Some legal text\r\n*** START OF THE PROJECT GUTENBERG EBOOK TEST ***\r\nThe story.\r\n" +
      "*** END OF THE PROJECT GUTENBERG EBOOK TEST ***\r\nMore legal text";
    expect(stripGutenberg(raw)).toBe("The story.");
  });

  it("leaves text alone when there are no markers", () => {
    expect(stripGutenberg("Just a story.")).toBe("Just a story.");
  });
});

describe("splitChapters", () => {
  it("skips contents lines and uses a short line after a bare heading as the title", () => {
    const text = [
      "CONTENTS",
      "",
      "CHAPTER I.",
      "CHAPTER II.",
      "",
      "CHAPTER I.",
      "",
      "The Beginning",
      "",
      filler(20),
      "",
      "CHAPTER II.",
      "",
      "The Middle",
      "",
      filler(20),
    ].join("\n");

    const chapters = splitChapters(text);
    expect(chapters.map((c) => c.title)).toEqual([
      "Chapter I: The Beginning",
      "Chapter II: The Middle",
    ]);
    expect(chapters[0].content).not.toContain("The Beginning");
  });

  it("joins wrapped lines into paragraphs and removes italic markers", () => {
    const text = "Chapter 1\n\nline one\nline two is _slanted_\n\nsecond paragraph\n\nChapter 2\n\nmore text";
    const chapters = splitChapters(text, undefined, { minLength: 1 });
    expect(chapters[0].content).toBe("line one line two is slanted\n\nsecond paragraph");
  });

  it("does not turn a sentence into a title when the heading already has one", () => {
    const heading = /^[IVX]+\.\s+\S.{2,60}$/m;
    const text = [
      "I. A SCANDAL IN BOHEMIA",
      "",
      "She is always the woman.",
      "",
      filler(20),
      "",
      "II. THE RED-HEADED LEAGUE",
      "",
      "I had called upon my friend.",
      "",
      filler(20),
    ].join("\n");

    const chapters = splitChapters(text, heading);
    expect(chapters.map((c) => c.title)).toEqual([
      "I. A Scandal In Bohemia",
      "II. The Red-headed League",
    ]);
    expect(chapters[0].content.startsWith("She is always the woman.")).toBe(true);
  });

  it("falls back to equal parts when no headings are found", () => {
    const paragraphs = Array.from({ length: 10 }, () => filler(100)).join("\n\n");
    const chapters = splitChapters(paragraphs);
    expect(chapters.length).toBeGreaterThan(1);
    expect(chapters[0].title).toBe("Part 1");
  });
});

describe("splitBySize", () => {
  it("never splits in the middle of a paragraph", () => {
    const text = Array.from({ length: 6 }, (_, i) => `Paragraph ${i}. ${filler(50)}`).join("\n\n");
    const parts = splitBySize(text, 2000);
    const joined = parts.map((p) => p.content).join("\n\n");
    expect(joined.split("\n\n")).toHaveLength(6);
  });
});