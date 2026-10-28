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
import Book from "../src/models/Book.js";
import ReadingProgress from "../src/models/ReadingProgress.js";

describe("books API", () => {
  beforeAll(connectTestDb);
  afterAll(disconnectTestDb);
  beforeEach(clearDb);

  describe("public catalogue", () => {
    it("lists books without the chapter text", async () => {
      await createBook();
      await createBook();
      const res = await request(app).get("/api/books");
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.books).toHaveLength(2);
      expect(res.body.books[0].chapters).toBeUndefined();
    });

    it("paginates and caps the page size", async () => {
      for (let i = 0; i < 5; i++) await createBook();

      const page3 = await request(app).get("/api/books?limit=2&page=3");
      expect(page3.body.books).toHaveLength(1);
      expect(page3.body.totalPages).toBe(3);

      const huge = await request(app).get("/api/books?limit=1000");
      expect(huge.body.limit).toBe(50);
    });

    it("filters by genre (case-insensitive input)", async () => {
      await createBook({ genres: ["horror"] });
      await createBook({ genres: ["romance"] });
      const res = await request(app).get("/api/books?genre=HORROR");
      expect(res.body.total).toBe(1);
      expect(res.body.books[0].genres).toContain("horror");
    });

    it("searches by text and ranks matches", async () => {
      await createBook({ title: "Frankenstein", description: "A scientist makes a monster" });
      await createBook({ title: "Dracula", description: "A vampire in Transylvania" });
      const res = await request(app).get("/api/books?search=frankenstein");
      expect(res.body.total).toBe(1);
      expect(res.body.books[0].title).toBe("Frankenstein");
    });

    it("ignores query values that are objects (NoSQL injection)", async () => {
      await createBook({ genres: ["horror"] });
      await createBook({ genres: ["romance"] });
      const res = await request(app).get("/api/books?genre[$ne]=horror");
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2); // the filter was ignored, not executed
    });

    it("returns 400 for a malformed id and 404 for an unknown one", async () => {
      const bad = await request(app).get("/api/books/123");
      expect(bad.status).toBe(400);

      const missing = await request(app).get("/api/books/000000000000000000000000");
      expect(missing.status).toBe(404);
    });

    it("returns one book without its chapters", async () => {
      const book = await createBook();
      const res = await request(app).get(`/api/books/${book._id}`);
      expect(res.status).toBe(200);
      expect(res.body.book.title).toBe(book.title);
      expect(res.body.book.chapters).toBeUndefined();
    });
  });

  describe("admin-only changes", () => {
    const payload = {
      title: "  New Book ",
      author: "Me",
      genres: ["Horror", " Gothic "],
      tags: ["Demo"],
      accessLevel: "premium",
      chapters: [{ title: "One", content: "Text" }],
    };

    it("rejects guests (401) and normal users (403)", async () => {
      const { token } = await createUser("user");

      const guest = await request(app).post("/api/books").send(payload);
      expect(guest.status).toBe(401);

      const normal = await request(app).post("/api/books").set(auth(token)).send(payload);
      expect(normal.status).toBe(403);
      expect(await Book.countDocuments()).toBe(0);
    });

    it("lets an admin create a book and cleans the input", async () => {
      const { token } = await createUser("admin");
      const res = await request(app)
        .post("/api/books")
        .set(auth(token))
        .send({ ...payload, chapterCount: 999 }); // a client must not set this

      expect(res.status).toBe(201);
      expect(res.body.book.title).toBe("New Book");
      expect(res.body.book.genres).toEqual(["horror", "gothic"]);
      expect(res.body.book.chapterCount).toBe(1);
    });

    it("rejects a book without a title or with an invalid access level", async () => {
      const { token } = await createUser("admin");

      const noTitle = await request(app)
        .post("/api/books")
        .set(auth(token))
        .send({ author: "Me" });
      expect(noTitle.status).toBe(400);

      const badLevel = await request(app)
        .post("/api/books")
        .set(auth(token))
        .send({ ...payload, accessLevel: "vip" });
      expect(badLevel.status).toBe(400);
    });

    it("keeps the chapters and chapter count when only the title is edited", async () => {
      const { token } = await createUser("admin");
      const book = await createBook();

      const res = await request(app)
        .put(`/api/books/${book._id}`)
        .set(auth(token))
        .send({ title: "Edited Title" });
      expect(res.status).toBe(200);
      expect(res.body.book.title).toBe("Edited Title");

      const saved = await Book.findById(book._id).select("+chapters");
      expect(saved.chapters).toHaveLength(2);
      expect(saved.chapterCount).toBe(2);
    });

    it("deletes a book together with readers' progress for it", async () => {
      const admin = await createUser("admin");
      const reader = await createUser("user");
      const book = await createBook();
      await ReadingProgress.create({ user: reader.user._id, book: book._id });

      const res = await request(app).delete(`/api/books/${book._id}`).set(auth(admin.token));
      expect(res.status).toBe(200);
      expect(await Book.countDocuments()).toBe(0);
      expect(await ReadingProgress.countDocuments()).toBe(0);
    });

    it("refuses deletion by a normal user", async () => {
      const { token } = await createUser("user");
      const book = await createBook();
      const res = await request(app).delete(`/api/books/${book._id}`).set(auth(token));
      expect(res.status).toBe(403);
      expect(await Book.countDocuments()).toBe(1);
    });
  });
});