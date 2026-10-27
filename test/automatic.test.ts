import { test } from "node:test"
import { strict as assert } from "node:assert"
import { setTimeout as delay } from "node:timers/promises"
import { startAutomaticLinking } from "../src/automatic.ts"

test("waits for editing to finish, then links a saved block once", async () => {
  let listener = () => {}
  let editing = true
  const writes: string[] = []
  const block = { uuid: "block-1", content: "Learning Logseq", format: "markdown", page: { id: 1 } }
  globalThis.logseq = {
    settings: { automaticLinking: true },
    App: { getCurrentGraph: async () => ({ path: "graph" }) },
    DB: { onChanged: (callback: typeof listener) => { listener = callback; return () => { listener = () => {} } } },
    Editor: {
      checkEditing: async () => editing,
      getBlock: async () => block,
      getPage: async () => ({ name: "journal", originalName: "Journal" }),
      getAllPages: async () => [{ name: "logseq", originalName: "Logseq" }],
      updateBlock: async (_uuid: string, content: string) => { writes.push(content); block.content = content },
    },
  }
  const stop = startAutomaticLinking()
  listener({ blocks: [block], txMeta: { outlinerOp: "save-block" } })
  await delay(650)
  assert.deepEqual(writes, [])
  editing = false
  await delay(600)
  assert.deepEqual(writes, ["Learning [[Logseq]]"])
  stop()
})

test("disabled automatic linking does not update blocks", async () => {
  let listener = () => {}
  let writes = 0
  globalThis.logseq = {
    settings: { automaticLinking: false },
    App: { getCurrentGraph: async () => ({ path: "graph" }) },
    DB: { onChanged: (callback: typeof listener) => { listener = callback; return () => {} } },
    Editor: { updateBlock: async () => { writes++ } },
  }
  const stop = startAutomaticLinking()
  listener({ blocks: [{ uuid: "block-1" }], txMeta: { outlinerOp: "save-block" } })
  await delay(600)
  assert.equal(writes, 0)
  stop()
})

test("drops a queued update if the graph changes or the setting is disabled", async () => {
  for (const change of ["graph", "setting"]) {
    let listener = () => {}
    let graphPath = "graph"
    let reads = 0
    globalThis.logseq = {
      settings: { automaticLinking: true },
      App: { getCurrentGraph: async () => ({ path: graphPath }) },
      DB: { onChanged: (callback: typeof listener) => { listener = callback; return () => {} } },
      Editor: { checkEditing: async () => false, getBlock: async () => { reads++; return null } },
    }
    const stop = startAutomaticLinking()
    listener({ blocks: [{ uuid: "block-1" }], txMeta: { outlinerOp: "save-block" } })
    await delay(50)
    if (change === "graph") graphPath = "other"
    else globalThis.logseq.settings.automaticLinking = false
    await delay(550)
    assert.equal(reads, 0)
    stop()
  }
})
