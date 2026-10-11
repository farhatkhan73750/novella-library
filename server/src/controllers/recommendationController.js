import asyncHandler from "../utils/asyncHandler.js";
import { buildRecommendations } from "../services/recommendationService.js";


export const getRecommendations = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 6, 1), 20);

  const { strategy, items } = await buildRecommendations(req.user._id, limit);

  res.json({
    strategy,
    recommendations: items.map((item) => ({
      book: item.book,
      reason: item.reason,
      score: item.score === null ? null : Math.round(item.score * 1000) / 1000,
    })),
  });
});