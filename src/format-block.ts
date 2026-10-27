import { buildIndex, linkText } from "./linker.ts"
import type { BlockEntity, PageEntity } from "@logseq/libs/dist/LSPlugin"

function pageName(page: PageEntity): string {
  const title: unknown = page.title
  return page.originalName || (typeof title === "string" ? title : page.name)
}

function blockContent(block: BlockEntity): string | undefined {
  const title: unknown = block.title
  return typeof block.content === "string" ? block.content : typeof title === "string" ? title : undefined
}

export async function formatCurrentBlock(): Promise<void> {
  const block = await logseq.Editor.getCurrentBlock()
  if (!block) {
    await logseq.UI.showMsg("Select a block to link its page mentions.", "warning")
    return
  }
  await formatBlock(block, true)
}

export async function formatBlock(block: BlockEntity, notify: boolean, options?: { graphPath: string; canWrite: () => boolean }): Promise<"done" | "retry"> {
  if (await logseq.Editor.checkEditing()) {
    if (notify) await logseq.UI.showMsg("Finish editing the block first (press Escape), then run the command again.", "warning")
    return "retry"
  }
  if (block.format !== "markdown" || !block.page) {
    if (notify) await logseq.UI.showMsg("Page Linker currently supports Markdown blocks only.", "warning")
    return "done"
  }
  const graph = await logseq.App.getCurrentGraph()
  const content = blockContent(block)
  const [page, pages] = await Promise.all([
    logseq.Editor.getPage(block.page.id),
    logseq.Editor.getAllPages(),
  ])
  if (!graph || (options && graph.path !== options.graphPath) || !page || !pages || content === undefined) {
    if (notify) await logseq.UI.showMsg("Could not read the current graph, page, or block.", "warning")
    return "done"
  }
  const result = linkText(content, buildIndex(pages.map(pageName)), pageName(page))
  if (result === content) {
    if (notify) await logseq.UI.showMsg("No page mentions to link.", "success")
    return "done"
  }
  const [currentGraph, latest, editing] = await Promise.all([
    logseq.App.getCurrentGraph(),
    logseq.Editor.getBlock(block.uuid),
    logseq.Editor.checkEditing(),
  ])
  if (currentGraph?.path !== graph.path || !latest || blockContent(latest) !== content || editing || (options && !options.canWrite())) {
    if (notify) await logseq.UI.showMsg("The graph or block changed. Run Page Linker again.", "warning")
    return editing ? "retry" : "done"
  }
  await logseq.Editor.updateBlock(block.uuid, result)
  if (notify) await logseq.UI.showMsg("Page mentions linked.", "success")
  return "done"
}
