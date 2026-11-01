import { test } from "node:test"
import { strict as assert } from "node:assert"
import { formatCurrentBlock } from "../src/format-block.ts"

function host(options: {
  editing?: boolean
  changed?: boolean
  graphChanged?: boolean
  databaseGraph?: boolean
  org?: boolean
  content?: string
  pages?: { id: number; name: string; originalName: string }[]
  tagIds?: number[]
} = {}) {
  const writes: string[] = []
  const messages: string[] = []
  const block = { uuid: "block-1", content: options.content ?? "Learning Logseq", ...(options.databaseGraph ? {} : { format: options.org ? "org" : "markdown" }), page: { id: 1 } }
  let graphReads = 0
  globalThis.logseq = {
    App: { getCurrentGraph: async () => ({ path: options.graphChanged && graphReads++ > 0 ? "other" : "graph" }) },
    DB: { datascriptQuery: async () => options.tagIds ?? [] },
    Editor: {
      getCurrentBlock: async () => block,
      checkEditing: async () => options.editing ?? false,
      getPage: async () => ({ name: "journal", originalName: "Journal" }),
      getAllPages: async () => options.pages ?? [{ id: 2, name: "logseq", originalName: "Logseq" }],
      getBlock: async () => ({ ...block, content: options.changed ? "new content" : block.content }),
      updateBlock: async (_uuid: string, content: string) => { writes.push(content) },
    },
    UI: { showMsg: async (message: string) => { messages.push(message) } },
  }
  return { writes, messages }
}

test("writes links for a selected, unchanged block", async () => {
  const state = host()
  await formatCurrentBlock()
  assert.deepEqual(state.writes, ["Learning [[Logseq]]"])
})

test("links a database graph block without a format field", async () => {
  const state = host({ databaseGraph: true })
  await formatCurrentBlock()
  assert.deepEqual(state.writes, ["Learning [[Logseq]]"])
})

test("skips tag definitions while linking ordinary pages", async () => {
  const state = host({
    databaseGraph: true,
    content: "Code Logseq Reading",
    pages: [
      { id: 177, name: "code", originalName: "Code" },
      { id: 2, name: "logseq", originalName: "Logseq" },
      { id: 619, name: "reading", originalName: "Reading" },
    ],
    tagIds: [177, 619],
  })
  await formatCurrentBlock()
  assert.deepEqual(state.writes, ["Code [[Logseq]] Reading"])
})

test("links an ordinary page named Code when it is not a tag", async () => {
  const state = host({
    content: "Learning Code",
    pages: [{ id: 177, name: "code", originalName: "Code" }],
  })
  await formatCurrentBlock()
  assert.deepEqual(state.writes, ["Learning [[Code]]"])
})

test("does not change an Org-mode block", async () => {
  const state = host({ org: true })
  await formatCurrentBlock()
  assert.deepEqual(state.writes, [])
})

test("does not write while editing or after a concurrent change", async () => {
  for (const options of [{ editing: true }, { changed: true }, { graphChanged: true }]) {
    const state = host(options)
    await formatCurrentBlock()
    assert.deepEqual(state.writes, [])
    assert.equal(state.messages.length, 1)
  }
})
