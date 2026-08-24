/**
 * Tally XML transport is retired. Books of record are ERPNext at D:\ERPNext,
 * reached through `/api/books`. This module re-exports the books agent so
 * leftover imports still compile; they never talk to Tally.
 */
export { booksAgent as tallyAgent, booksAgent } from "./books";
export type { BooksResult as TallyPostResult } from "./books";
