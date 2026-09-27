/**
 * Utility functions for Web Speech API transcription processing.
 *
 * Solves:
 * 1. Android Chrome / WebKit SpeechRecognition cumulative repetition bug.
 *    (Where continuous results accumulate from index 0 or re-emit the entire sentence).
 * 2. Overlapping phrase boundaries between interim and final result chunks.
 * 3. Redundant duplicate words/chunks during live speech updates.
 */

export function mergeSpeechChunks(chunks: (string | null | undefined)[]): string {
  const cleanChunks = chunks
    .map((c) => (c || "").trim().replace(/\s+/g, " "))
    .filter((c) => c.length > 0);

  if (cleanChunks.length === 0) return "";

  const merged: string[] = [];

  for (const chunk of cleanChunks) {
    if (merged.length === 0) {
      merged.push(chunk);
      continue;
    }

    const lastIdx = merged.length - 1;
    const last = merged[lastIdx];
    const lastLower = last.toLowerCase();
    const chunkLower = chunk.toLowerCase();

    // 1. Exact duplicate chunk
    if (chunkLower === lastLower) {
      continue;
    }

    // 2. Cumulative extension (Current chunk contains previous chunk from the beginning)
    // Example: last = "Buatkan", chunk = "Buatkan saya"
    if (chunkLower.startsWith(lastLower)) {
      merged[lastIdx] = chunk;
      continue;
    }

    // 3. Shorter prefix (Current chunk is a substring of previous chunk)
    // Example: last = "Buatkan saya", chunk = "Buatkan"
    if (lastLower.startsWith(chunkLower)) {
      continue;
    }

    // 4. Overlap detection (The tail words of `last` match the head words of `chunk`)
    // Example: last = "buatkan saya sebuah", chunk = "sebuah website portofolio"
    const lastWords = last.split(" ");
    const chunkWords = chunk.split(" ");
    let overlapFound = false;

    const maxOverlap = Math.min(lastWords.length, chunkWords.length);
    for (let w = maxOverlap; w >= 1; w--) {
      const lastTail = lastWords.slice(-w).join(" ").toLowerCase();
      const chunkHead = chunkWords.slice(0, w).join(" ").toLowerCase();

      if (lastTail === chunkHead) {
        const remainingChunk = chunkWords.slice(w).join(" ");
        if (remainingChunk) {
          merged[lastIdx] = `${last} ${remainingChunk}`;
        }
        overlapFound = true;
        break;
      }
    }

    if (!overlapFound) {
      merged.push(chunk);
    }
  }

  let result = merged.join(" ").trim();

  // Deduplicate any accidental 3+ consecutive identical words (e.g. "saya saya saya" -> "saya")
  // Allows normal Indonesian repetition like "pelan-pelan" or "sama-sama" / "jalan jalan"
  result = result.replace(/\b([a-zA-Z0-9\u00C0-\u024F]+)(?:\s+\1){2,}\b/gi, "$1");

  return result;
}
