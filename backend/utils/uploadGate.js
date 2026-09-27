/**
 * Simple in-process concurrency gate for heavy upload parsing.
 * Prevents N simultaneous XLSX parses from exhausting the heap.
 *
 * Single-instance only. For multi-instance, replace with a Redis semaphore.
 */
const MAX_CONCURRENT = 2;
let active = 0;

function tryAcquire() {
  if (active >= MAX_CONCURRENT) return false;
  active++;
  return true;
}

function release() {
  if (active > 0) active--;
}

module.exports = { tryAcquire, release, MAX_CONCURRENT };