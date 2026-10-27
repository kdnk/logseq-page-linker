import { test } from "node:test"
import { strict as assert } from "node:assert"
import { formatCurrentBlock } from "../src/format-block.ts"

function host(options: { editing?: boolean; changed?: boolean; graphChanged?: boolean; databaseGraph?: boolean; org?: boolean } = {}) {
  const writes: string[] = []
  const messages: string[] = []
  const block = { uuid: "block-1", content: "Learning Logseq", ...(options.databaseGraph ? {} : { format: options.org ? "org" : "markdown" }), page: { id: 1 } }
  let graphReads = 0
  globalThis.logseq = {
    App: { getCurrentGraph: async () => ({ path: options.graphChanged && graphReads++ > 0 ? "other" : "graph" }) },
    Editor: {
      getCurrentBlock: async () => block,
      checkEditing: async () => options.editing ?? false,
      getPage: async () => ({ name: "journal", originalName: "Journal" }),
      getAllPages: async () => [{ name: "logseq", originalName: "Logseq" }],
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
