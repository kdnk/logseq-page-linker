import "@logseq/libs"
import { formatCurrentBlock } from "./format-block.ts"
import { startAutomaticLinking } from "./automatic.ts"

logseq.useSettingsSchema([{
  key: "automaticLinking",
  type: "boolean",
  default: false,
  title: "Link after editing",
  description: "Automatically link page mentions after saved blocks are no longer being edited.",
}])

function main(): void {
  const stopAutomaticLinking = startAutomaticLinking()
  logseq.beforeunload(async () => stopAutomaticLinking())
  logseq.App.registerCommandPalette({ key: "link-current-block", label: "Page Linker: Link current block" }, () => {
    void formatCurrentBlock().catch(async (error: unknown) => {
      console.error("Page Linker failed", error)
      await logseq.UI.showMsg("Page Linker could not update the block. See the developer console for details.", "error")
    })
  })
}

void logseq.ready(main).catch(console.error)
