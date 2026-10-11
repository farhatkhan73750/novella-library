import Book from "../models/Book.js";
import ReadingProgress from "../models/ReadingProgress.js";

const BOOK_FIELDS = "title author genres tags coverImage type accessLevel chapterCount";


const WEIGHTS = { genre: 0.5, tag: 0.35, author: 0.15 };


export const engagementWeight = (item) => {
  if (item.completed) return 3;
  const total = item.book.chapterCount || 1;
  const fraction = Math.min(item.furthestChapter / total, 1);
  return 1 + fraction; // between 1 and 2
};


const normalize = (map) => {
  const total = [...map.values()].reduce((sum, v) => sum + v, 0);
  if (total === 0) return map;
  for (const [key, value] of map) map.set(key, value / total);
  return map;
};


export const buildProfile = (history) => {
  const genres = new Map();
  const tags = new Map();
  const authors = new Map();
  const add = (map, key, weight) => map.set(key, (map.get(key) || 0) + weight);

  for (const item of history) {
    const weight = engagementWeight(item);
    item.book.genres.forEach((g) => add(genres, g, weight));
    item.book.tags.forEach((t) => add(tags, t, weight));
    add(authors, item.book.author.toLowerCase(), weight);
  }

  return {
    genres: normalize(genres),
    tags: normalize(tags),
    authors: normalize(authors),
  };
};


const sumWeights = (map, keys) =>
  keys.reduce((sum, key) => sum + (map.get(key) || 0), 0);

export const scoreBook = (profile, book) => {
  const genre = sumWeights(profile.genres, book.genres);
  const tag = sumWeights(profile.tags, book.tags);
  const author = profile.authors.get(book.author.toLowerCase()) || 0;
  return WEIGHTS.genre * genre + WEIGHTS.tag * tag + WEIGHTS.author * author;
};


const similarity = (a, b) => {
  const sharedGenres = a.genres.filter((g) => b.genres.includes(g)).length;
  const sharedTags = a.tags.filter((t) => b.tags.includes(t)).length;
  const sameAuthor = a.author.toLowerCase() === b.author.toLowerCase() ? 2 : 0;
  return sharedGenres + sharedTags + sameAuthor;
};

const explain = (history, book) => {
  let best = null;
  let bestValue = 0;
  for (const item of history) {
    const value = similarity(item.book, book) * engagementWeight(item);
    if (value > bestValue) {
      best = item;
      bestValue = value;
    }
  }
  return best ? `Because you read ${best.book.title}` : "Matches your taste";
};


export const recommendFromHistory = (history, candidates, limit) => {
  const profile = buildProfile(history);
  return candidates
    .map((book) => ({ book, score: scoreBook(profile, book) }))
    .filter((r) => r.score > 0)
    .sort(
      (a, b) => b.score - a.score || a.book.title.localeCompare(b.book.title)
    )
    .slice(0, limit)
    .map((r) => ({ ...r, reason: explain(history, r.book) }));
};


const withReason = (books, reason) =>
  books.map((book) => ({ book, score: null, reason }));

const getPopular = async (excludeIds, limit) => {
  if (limit <= 0) return [];

  const counts = await ReadingProgress.aggregate([
    { $match: { book: { $nin: excludeIds } } },
    { $group: { _id: "$book", readers: { $sum: 1 } } },
    { $sort: { readers: -1, _id: 1 } },
    { $limit: limit },
  ]);

  const ids = counts.map((c) => c._id);
  const found = await Book.find({ _id: { $in: ids } })
    .select(BOOK_FIELDS)
    .lean();
  const byId = new Map(found.map((b) => [String(b._id), b]));
  const popular = ids.map((id) => byId.get(String(id))).filter(Boolean);

  let items = withReason(popular, "Popular with readers");

  
  if (items.length < limit) {
    const taken = [...excludeIds, ...popular.map((b) => b._id)];
    const newest = await Book.find({ _id: { $nin: taken } })
      .sort({ createdAt: -1 })
      .limit(limit - items.length)
      .select(BOOK_FIELDS)
      .lean();
    items = items.concat(withReason(newest, "New on Novella"));
  }
  return items;
};


export const buildRecommendations = async (userId, limit) => {
  const history = (
    await ReadingProgress.find({ user: userId })
      .populate("book", BOOK_FIELDS)
      .lean()
  ).filter((item) => item.book); 

  const readIds = history.map((item) => item.book._id);

  
  if (history.length === 0) {
    return { strategy: "popular", items: await getPopular([], limit) };
  }

  const candidates = await Book.find({ _id: { $nin: readIds } })
    .select(BOOK_FIELDS)
    .limit(1000)
    .lean();

  const personal = recommendFromHistory(history, candidates, limit);
  let items = personal;

  
  if (items.length < limit) {
    const extra = await getPopular(
      [...readIds, ...personal.map((i) => i.book._id)],
      limit - items.length
    );
    items = items.concat(extra);
  }

  const strategy =
    personal.length === 0
      ? "popular"
      : personal.length < limit
      ? "mixed"
      : "personalized";

  return { strategy, items };
};