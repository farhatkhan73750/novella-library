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

const read = (token, bookId, chapter = 1) =>
  request(app).get(`/api/reading/${bookId}/chapters/${chapter}`).set(auth(token));

describe("reader access rules", () => {
  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);
  beforeEach(clearDb);

  it("blocks guests", async () => {
    const book = await createBook();
    const res = await request(app).get(`/api/reading/${book._id}/chapters/1`);
    expect(res.status).toBe(401);
  });

  it("lets a free user read a free book and reports the quota", async () => {
    const { token } = await createUser("user");
    const book = await createBook();
    const res = await read(token, book._id);
    expect(res.status).toBe(200);
    expect(res.body.chapter.content).toBe("First chapter text.");
    expect(res.body.quota).toEqual({ used: 1, limit: 2 });
  });

  it("validates the book id and the chapter number", async () => {
    const { token } = await createUser("user");
    const book = await createBook();

    expect((await read(token, "123")).status).toBe(400);
    expect((await read(token, book._id, "abc")).status).toBe(400);
    expect((await read(token, book._id, 0)).status).toBe(400);
    expect((await read(token, book._id, 3)).status).toBe(404);
  });

  it("blocks premium books for free users but not for subscribers or admins", async () => {
    const book = await createBook({ accessLevel: "premium" });
    const free = await createUser("user");
    const subscriber = await createUser("subscriber");
    const admin = await createUser("admin");

    const blocked = await read(free.token, book._id);
    expect(blocked.status).toBe(403);
    expect(blocked.body.message).toMatch(/subscribers only/i);
    expect(blocked.body.chapter).toBeUndefined(); // no text leaks in the error

    const allowed = await read(subscriber.token, book._id);
    expect(allowed.status).toBe(200);
    expect(allowed.body.quota).toBeNull();

    expect((await read(admin.token, book._id)).status).toBe(200);
  });

  describe("monthly free limit", () => {
    it("stops a free user at the limit but still allows already-unlocked books", async () => {
      const { token } = await createUser("user");
      const a = await createBook();
      const b = await createBook();
      const c = await createBook();

      expect((await read(token, a._id)).status).toBe(200);
      expect((await read(token, b._id)).status).toBe(200);

      const blocked = await read(token, c._id);
      expect(blocked.status).toBe(403);
      expect(blocked.body.message).toMatch(/limit/i);
      expect(await ReadingProgress.countDocuments({ book: c._id })).toBe(0);

      // Re-reading a book already unlocked this month is free
      expect((await read(token, a._id)).status).toBe(200);
    });

    it("counts several chapters of one book as one book", async () => {
      const { token } = await createUser("user");
      const book = await createBook();
      await read(token, book._id, 1);
      const second = await read(token, book._id, 2);
      expect(second.body.quota.used).toBe(1);
    });

    it("gives every user their own quota", async () => {
      const first = await createUser("user");
      const second = await createUser("user");
      const a = await createBook();
      const b = await createBook();
      const c = await createBook();

      await read(first.token, a._id);
      await read(first.token, b._id);
      expect((await read(first.token, c._id)).status).toBe(403);
      expect((await read(second.token, c._id)).status).toBe(200);
    });

    it("starts counting from zero in a new month", async () => {
      const { token } = await createUser("user");
      const a = await createBook();
      const b = await createBook();
      const c = await createBook();

      await read(token, a._id);
      await read(token, b._id);
      expect((await read(token, c._id)).status).toBe(403);

      // Pretend those two books were unlocked in an old month
      await ReadingProgress.updateMany({}, { unlockedMonth: "2000-01" });
      expect((await read(token, c._id)).status).toBe(200);
    });

    it("does not limit subscribers", async () => {
      const { token } = await createUser("subscriber");
      for (let i = 0; i < 4; i++) {
        const book = await createBook();
        expect((await read(token, book._id)).status).toBe(200);
      }
    });

    it("reports the quota through /quota", async () => {
      const free = await createUser("user");
      const subscriber = await createUser("subscriber");
      const book = await createBook();
      await read(free.token, book._id);

      const used = await request(app).get("/api/reading/quota").set(auth(free.token));
      expect(used.body).toMatchObject({ unlimited: false, used: 1, limit: 2, remaining: 1 });

      const unlimited = await request(app).get("/api/reading/quota").set(auth(subscriber.token));
      expect(unlimited.body.unlimited).toBe(true);
    });
  });

  describe("progress", () => {
    it("saves the bookmark and marks the book completed at the last chapter", async () => {
      const { user, token } = await createUser("user");
      const book = await createBook();

      await read(token, book._id, 1);
      let progress = await ReadingProgress.findOne({ user: user._id, book: book._id });
      expect(progress.lastChapter).toBe(1);
      expect(progress.completed).toBe(false);

      await read(token, book._id, 2);
      progress = await ReadingProgress.findOne({ user: user._id, book: book._id });
      expect(progress.completed).toBe(true);

      // Going back keeps the furthest point and the completed flag
      await read(token, book._id, 1);
      progress = await ReadingProgress.findOne({ user: user._id, book: book._id });
      expect(progress.lastChapter).toBe(1);
      expect(progress.furthestChapter).toBe(2);
      expect(progress.completed).toBe(true);
    });

    it("lists the reading history", async () => {
      const { token } = await createUser("user");
      const book = await createBook();
      await read(token, book._id, 2);

      const res = await request(app).get("/api/reading/history").set(auth(token));
      expect(res.status).toBe(200);
      expect(res.body.history).toHaveLength(1);
      expect(res.body.history[0].lastChapter).toBe(2);
    });

    it("survives two identical first-time requests at once (no 409)", async () => {
      const { token } = await createUser("user");
      const book = await createBook();

      const [one, two] = await Promise.all([read(token, book._id), read(token, book._id)]);
      expect(one.status).toBe(200);
      expect(two.status).toBe(200);
      expect(await ReadingProgress.countDocuments({ book: book._id })).toBe(1);
    });
  });
});