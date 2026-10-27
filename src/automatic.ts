import { formatBlock } from "./format-block.ts"

export function startAutomaticLinking(): () => void {
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  let stopped = false

  function enqueue(uuid: string, graphPath: string): void {
    const previous = timers.get(uuid)
    if (previous) clearTimeout(previous)
    timers.set(uuid, setTimeout(() => {
      timers.delete(uuid)
      void process(uuid, graphPath).catch((error: unknown) => console.error("Page Linker automatic update failed", error))
    }, 500))
  }

  async function process(uuid: string, graphPath: string): Promise<void> {
    if (stopped || logseq.settings?.automaticLinking !== true) return
    const [graph, editing] = await Promise.all([logseq.App.getCurrentGraph(), logseq.Editor.checkEditing()])
    if (stopped || logseq.settings?.automaticLinking !== true || graph?.path !== graphPath) return
    if (editing) {
      enqueue(uuid, graphPath)
      return
    }
    const block = await logseq.Editor.getBlock(uuid)
    if (stopped || logseq.settings?.automaticLinking !== true || !block) return
    const result = await formatBlock(block, false, {
      graphPath,
      canWrite: () => !stopped && logseq.settings?.automaticLinking === true,
    })
    if (result === "retry" && !stopped && logseq.settings?.automaticLinking === true) enqueue(uuid, graphPath)
  }

  const unsubscribe = logseq.DB.onChanged(({ blocks, txMeta }) => {
    if (logseq.settings?.automaticLinking !== true || txMeta?.outlinerOp !== "save-block") return
    void logseq.App.getCurrentGraph().then((graph) => {
      if (stopped || logseq.settings?.automaticLinking !== true || !graph) return
      for (const block of blocks) if (block.uuid) enqueue(block.uuid, graph.path)
    }).catch((error: unknown) => console.error("Page Linker could not read the current graph", error))
  })

  return () => {
    stopped = true
    unsubscribe()
    for (const timer of timers.values()) clearTimeout(timer)
    timers.clear()
  }
}
