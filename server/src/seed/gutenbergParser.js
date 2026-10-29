// Pure functions: text in, chapters out. No database and no network,
// so they are easy to test.

const START = /\*\*\* ?START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\n/i;
const END = /\*\*\* ?END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i;

// Matches "Chapter 4", "CHAPTER IV.", "Letter 2", and a title on the same line
export const DEFAULT_HEADING = /^(?:chapter|letter)\s+[\divxlcdm]+\b.*$/im;

// A heading with no title text of its own: "CHAPTER I." or "Letter 1"
const BARE_HEADING = /^(?:chapter|letter)\s+[\divxlcdm]+\.?$/i;

const ROMAN = /^[IVXLCDM]{1,4}\.?$/;

// Remove the license header and footer, and normalise line endings
export const stripGutenberg = (raw) => {
  let text = raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const start = text.match(START);
  if (start) text = text.slice(start.index + start[0].length);
  const end = text.search(END);
  if (end !== -1) text = text.slice(0, end);
  return text.trim();
};

// "line one\nline two" -> "line one line two", and remove _italic_ markers
const unwrap = (paragraph) =>
  paragraph.replace(/_/g, "").replace(/\s*\n\s*/g, " ").replace(/\s+/g, " ").trim();

const toParagraphs = (text) =>
  text
    .split(/\n{2,}/)
    .map(unwrap)
    .filter(Boolean);

// "CHAPTER II." -> "Chapter II", "A SCANDAL IN BOHEMIA" -> "A Scandal In Bohemia"
const tidyHeading = (line) => {
  let s = line.replace(/_/g, "").replace(/\s+/g, " ").trim().replace(/\.$/, "");
  const letters = /[A-Za-z]/.test(s);
  if (letters && s === s.toUpperCase()) {
    s = s
      .split(" ")
      .map((w) => (ROMAN.test(w) ? w : w.charAt(0) + w.slice(1).toLowerCase()))
      .join(" ");
  }
  s = s.replace(/^chapter/i, "Chapter");
  return s.slice(0, 100);
};

const buildChapter = (headingLine, body) => {
  const paragraphs = body.split(/\n{2,}/);
  let title = tidyHeading(headingLine);
  let rest = paragraphs;

  // "CHAPTER I." followed by a short line like "Down the Rabbit-Hole": use it as the title
  const first = paragraphs[0].trim();
  if (
    BARE_HEADING.test(headingLine.trim()) &&
    paragraphs.length > 1 &&
    first.length <= 60 &&
    !first.includes("\n") &&
    !/[,;]$/.test(first)
  ) {
    title = `${title}: ${tidyHeading(first)}`.slice(0, 100);
    rest = paragraphs.slice(1);
  }

  const content = rest.map(unwrap).filter(Boolean).join("\n\n");
  return { title, content };
};

// Fallback when no headings are found: equal-ish parts at paragraph boundaries
export const splitBySize = (text, size = 8000) => {
  const parts = [];
  let current = [];
  let length = 0;

  for (const paragraph of toParagraphs(text)) {
    current.push(paragraph);
    length += paragraph.length;
    if (length >= size) {
      parts.push(current.join("\n\n"));
      current = [];
      length = 0;
    }
  }
  if (current.length > 0) parts.push(current.join("\n\n"));

  return parts.map((content, i) => ({ title: `Part ${i + 1}`, content }));
};

export const splitChapters = (text, heading = DEFAULT_HEADING, { minLength = 300 } = {}) => {
  const flags = heading.flags.includes("g") ? heading.flags : `${heading.flags}g`;
  const matches = [...text.matchAll(new RegExp(heading.source, flags))];

  const chapters = [];
  matches.forEach((m, i) => {
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    const body = text.slice(m.index + m[0].length, end).trim();
    // Table-of-contents lines have no text after them, so they are skipped here
    if (body.length < minLength) return;
    chapters.push(buildChapter(m[0], body));
  });

  return chapters.length >= 2 ? chapters : splitBySize(text);
};