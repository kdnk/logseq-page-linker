# Logseq Page Linker

Link mentions of existing page names in a Logseq Markdown block. This is an initial Logseq adaptation of [Obsidian Automatic Linker](https://github.com/kdnk/obsidian-automatic-linker).

## Install for development

1. Install Node.js and run `npm install` followed by `npm run build` in this directory.
2. In Logseq, enable developer mode under Settings → Advanced.
3. Open Plugins, choose **Load unpacked plugin**, and select this directory.

## Use

Finish editing a block with Escape, select the block, and run **Page Linker: Link current block** from the command palette. For example, if `Logseq` is an existing page, `Learning Logseq` becomes `Learning [[Logseq]]`.

The plugin matches page names with their original capitalization, prefers longer matches, and supports Japanese, Chinese, and Korean text. It skips the current page and one- or two-digit page names. Existing links, URLs, tags, block references, macros, code, and property lines are preserved. A changed block is checked again before writing; rerun the command if the graph or block changed during processing.

To link automatically, enable **Link after editing** in the plugin settings. The plugin watches saved blocks and waits until editing has stopped before updating them. Logseq does not expose a conditional block update, so a change made between the final check and the write could still be overwritten. Automatic linking is disabled by default.

This initial version handles one block at a time. Page aliases, namespace resolution, URL formatting, and the other commands and settings from the Obsidian plugin are not implemented. Org-mode blocks are not supported.

Run `npm test` to check the text transformation and `npm run build` to type-check and build the plugin. The test command requires Node.js 22.18 or later.
