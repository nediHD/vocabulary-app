// Reinsert card at specific offset from current position
// offset: how many positions ahead to insert (3 for "nicht gewusst", end for "1x gewusst")
export function reinsertAt(queue, card, offset = null) {
  if (offset === null) {
    // Ans Ende (für 1x Gewusst beim Lernen)
    return [...queue, card]
  }
  // offset Positionen nach vorne
  const insertAt = Math.max(0, offset)
  const next = [...queue]
  next.splice(insertAt, 0, card)
  return next
}
