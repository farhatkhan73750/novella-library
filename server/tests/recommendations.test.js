import { describe, it, expect, beforeAll, afterAll, beforeEach } from "@jest/globals";
import request from "supertest";
import {
  connectTestDb,
  disconnectTestDb,
  clearDb,
  createUser,
  createBook,
  auth,
} from "./helpers.js";
import app from "../src/app.js";
import ReadingProgress from "../src/models/ReadingProgress.js";
import {
  engagementWeight,
  recommendFromHistory,
} from "../src/services/recommendationService.js";

// ----- Plain data builders for the scoring tests (no database needed) -----
const makeBook = (id, title, genres, tags = [], author = "Someone") => ({
  _id: id,
  title,
  author,
  genres,
  tags,
  chapterCount: 2,
});
const finished = (book) => ({ book, completed: true, furthestChapter: 2 });
const abandoned = (book) => ({ book, completed: false, furthestChapter: 1 });

describe("recommendation scoring (pure function)", () => {
  it("weights finished books above half-read ones", () => {
    const book = makeBook("1", "A", ["horror"]);
    expect(engagementWeight(finished(book))).toBe(3);
    expect(engagementWeight(abandoned(book))).toBe(1.5);
  });

    it("recommends books that share genres and skips unrelated ones", () => {
    const history = [finished(makeBook("1", "Dracula", ["horror"]))];
    const candidates = [
      makeBook("2", "Another Horror", ["horror"]),
      makeBook("3", "A Romance", ["romance"], [], "Different Author"),
    ];
    const result = recommendFromHistory(history, candidates, 5);
    expect(result.map((r) => r.book.title)).toEqual(["Another Horror"]);
  });

  it("favours the genre of finished books over abandoned ones", () => {
    const history = [
      finished(makeBook("1", "Loved", ["horror"])),
      abandoned(makeBook("2", "Dropped", ["romance"])),
    ];
    const candidates = [
      makeBook("3", "More Romance", ["romance"]),
      makeBook("4", "More Horror", ["horror"]),
    ];
    const result = recommendFromHistory(history, candidates, 5);
    expect(result[0].book.title).toBe("More Horror");
  });

  it("explains the recommendation with the most similar book read", () => {
    const history = [
      finished(makeBook("1", "Dracula", ["horror"], ["gothic"])),
      finished(makeBook("2", "Emma", ["romance"], ["regency"])),
    ];
    const candidates = [makeBook("3", "Dorian Gray", ["horror"], ["gothic"])];
    const [top] = recommendFromHistory(history, candidates, 5);
    expect(top.reason).toBe("Because you read Dracula");
  });

  it("breaks ties by title so results are stable", () => {
    const history = [finished(makeBook("1", "Seed", ["horror"]))];
    const candidates = [
      makeBook("2", "Beta", ["horror"]),
      makeBook("3", "Alpha", ["horror"]),
    ];
    const result = recommendFromHistory(history, candidates, 5);
    expect(result.map((r) => r.book.title)).toEqual(["Alpha", "Beta"]);
  });

  it("respects the limit and returns nothing for an empty history", () => {
    const candidates = [
      makeBook("2", "One", ["horror"]),
      makeBook("3", "Two", ["horror"]),
    ];
    const history = [finished(makeBook("1", "Seed", ["horror"]))];
    expect(recommendFromHistory(history, candidates, 1)).toHaveLength(1);
    expect(recommendFromHistory([], candidates, 5)).toEqual([]);
  });
});

describe("GET /api/recommendations", () => {
  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);
  beforeEach(clearDb);

  it("requires a login", async () => {
    const res = await request(app).get("/api/recommendations");
    expect(res.status).toBe(401);
  });

  it("falls back to popular and new books for a user with no history", async () => {
    const { token } = await createUser("user");
    await createBook();
    await createBook();

    const res = await request(app).get("/api/recommendations").set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.strategy).toBe("popular");
    expect(res.body.recommendations.length).toBe(2);
    expect(res.body.recommendations[0].reason).toBeTruthy();
    expect(res.body.recommendations[0].book.chapters).toBeUndefined();
  });

  it("recommends by taste and never suggests a book already read", async () => {
    const { user, token } = await createUser("user");
    const read = await createBook({ title: "Read Horror", genres: ["horror"] });
    const similar = await createBook({ title: "Similar Horror", genres: ["horror"] });
    await createBook({ title: "Unrelated Romance", genres: ["romance"] });

    await ReadingProgress.create({
      user: user._id,
      book: read._id,
      lastChapter: 2,
      furthestChapter: 2,
      completed: true,
    });

    const res = await request(app).get("/api/recommendations").set(auth(token));
    expect(res.status).toBe(200);

    const titles = res.body.recommendations.map((r) => r.book.title);
    expect(titles[0]).toBe(similar.title);
    expect(titles).not.toContain("Read Horror");
  });
});