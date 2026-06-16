// Reinsert card so it reappears after the next 4 cards.
// currentIdx: the index of the card we just processed
// Returns a new queue array with the card reinserted at the appropriate position
export function reinsert(queue, card, currentIdx) {
  const insertAt = Math.min(currentIdx + 5, queue.length)
  const next = [...queue]
  next.splice(insertAt, 0, card)
  return next
}
