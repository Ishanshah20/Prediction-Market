// ── XLM Balance Hook (replaces PRED token balance) ───────────────────────────
// Re-exports useXlmBalance so all existing `useTokenBalance` imports still work

export { useXlmBalance as useTokenBalance } from './useXlmBalance'
