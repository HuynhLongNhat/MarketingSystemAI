import { getKeywords, normalizeText } from "../conversations/knowledge-ranking.js";

export type HybridCandidate = {
  documentId: string;
  documentTitle: string;
  chunkId: string;
  content: string;
  similarity: number;
  lexicalScore?: number;
  hybridScore?: number;
};

export function rankLexicalCandidates(
  candidates: HybridCandidate[],
  query: string,
): HybridCandidate[] {
  const keywords = [...getKeywords(query)];
  const normalizedQuery = normalizeText(query);
  if (keywords.length === 0) return [];

  return candidates
    .map((candidate) => {
      const text = normalizeText(candidate.content);
      const matched = keywords.filter((keyword) => text.includes(keyword));
      const coverage = matched.length / keywords.length;
      const phraseBonus = keywords.length > 1 && text.includes(keywords.join(" ")) ? 8 : 0;
      const score = matched.length * 3 + coverage * 8 + phraseBonus + (text.includes(normalizedQuery) ? 8 : 0);
      return { ...candidate, lexicalScore: score, matched: matched.length };
    })
    .filter((candidate) => candidate.matched >= Math.min(2, keywords.length) || candidate.lexicalScore >= 11)
    .sort((a, b) => b.lexicalScore - a.lexicalScore)
    .map(({ matched, ...candidate }) => {
      void matched;
      return candidate as HybridCandidate;
    });
}

export function reciprocalRankFusion(
  semantic: HybridCandidate[],
  lexical: HybridCandidate[],
  limit: number,
): HybridCandidate[] {
  const fused = new Map<string, HybridCandidate>();
  const add = (candidate: HybridCandidate, rank: number) => {
    const existing = fused.get(candidate.chunkId);
    const contribution = 1 / (60 + rank);
    fused.set(candidate.chunkId, {
      ...(existing ?? candidate),
      lexicalScore: candidate.lexicalScore ?? existing?.lexicalScore,
      hybridScore: (existing?.hybridScore ?? 0) + contribution,
      similarity: Math.max(existing?.similarity ?? 0, candidate.similarity),
    });
  };
  semantic.forEach((candidate, index) => add(candidate, index + 1));
  lexical.forEach((candidate, index) => add(candidate, index + 1));
  return [...fused.values()].sort((a, b) => (b.hybridScore ?? 0) - (a.hybridScore ?? 0)).slice(0, limit);
}
