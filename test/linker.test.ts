import { test } from "node:test"
import { strict as assert } from "node:assert"
import { buildIndex, linkText } from "../src/linker.ts"

const index = buildIndex(["Logseq", "Logseq plugin", "日本", "東京", "React", "1", "current"])
const format = (text: string) => linkText(text, index, "current")

test("links longest page names, CJK text and whole words, excluding self", () => {
  assert.equal(format("Logseq plugin and Logseq in 日本の東京; Reacting current 1"), "[[Logseq plugin]] and [[Logseq]] in [[日本]]の[[東京]]; Reacting current 1")
})

test("preserves Logseq and Markdown syntax and remains idempotent", () => {
  const text = "[[Logseq]] [React](https://example.com/React) `React` #React ((React)) {{React}} https://example.com/React \\React"
  assert.equal(format(text), text)
  const once = format("React and Logseq")
  assert.equal(format(once), once)
})

test("preserves properties and fenced code including unclosed fences", () => {
  assert.equal(format("alias:: React\nReact\n```ts\nReact\n```\nReact"), "alias:: React\n[[React]]\n```ts\nReact\n```\n[[React]]")
  assert.equal(format("before\n```\nReact"), "before\n```\nReact")
  assert.equal(format("種類:: React\nReact `unfinished React\nReact"), "種類:: React\n[[React]] `unfinished React\n[[React]]")
  assert.equal(format("``React ` React`` React"), "``React ` React`` [[React]]")
})

test("does not change Logseq task markers", () => {
  assert.equal(linkText("TODO React", buildIndex(["TODO", "React"]), ""), "TODO [[React]]")
})
