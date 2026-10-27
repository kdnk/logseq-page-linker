type Trie = { children: Map<string, Trie>; name?: string }

const wordCharacter = /[\p{L}\p{N}_/-]/u
const cjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u

function boundary(character: string | undefined): boolean {
  return character === undefined || cjk.test(character) || !wordCharacter.test(character)
}

export function buildIndex(names: string[]): Trie {
  const root: Trie = { children: new Map() }
  for (const name of names) {
    if (!name.trim() || /[\[\]\n\r]/.test(name) || /^\d{1,2}$/.test(name)) continue
    let node = root
    for (const char of name) {
      let child = node.children.get(char)
      if (!child) {
        child = { children: new Map() }
        node.children.set(char, child)
      }
      node = child
    }
    node.name = name
  }
  return root
}

// Protect Logseq syntax as well as Markdown before searching ordinary prose.
const protectedSyntax = /(?:\[\[[\s\S]*?(?:\]\]|$)|\[[^\]\n]*\]\((?:[^()\n]|\([^()\n]*\))*\)|\[[^\]\n]*\](?:\[[^\]\n]*\])?|\(\([\s\S]*?(?:\)\)|$)|\{\{[\s\S]*?(?:\}\}|$)|(?:https?:\/\/|mailto:)[^\s<>]+|#(?:\[\[[^\]]+\]\]|[\p{L}\p{N}_/-]+)|<[^>\n]+>|\\.)/uy
const propertyLine = /[ \t]*[^\n:]+::[^\n]*(?:\n|$)/y
const fenceStart = / {0,3}(`{3,}|~{3,})[^\n]*(?:\n|$)/y
const taskMarker = /(?:TODO|DOING|DONE|NOW|LATER|WAITING|CANCELED|CANCELLED)(?=\s|$)/y

export function linkText(text: string, index: Trie, currentPage: string): string {
  let result = ""
  let position = 0
  while (position < text.length) {
    const lineStart = position === 0 || text[position - 1] === "\n"
    propertyLine.lastIndex = position
    fenceStart.lastIndex = position
    const property = lineStart ? propertyLine.exec(text) : null
    const fence = lineStart ? fenceStart.exec(text) : null
    if (fence) {
      const closing = new RegExp(`^ {0,3}${fence[1][0]}{${fence[1].length},}[ \\t]*(?:\\n|$)`, "gm")
      closing.lastIndex = position + fence[0].length
      const match = closing.exec(text)
      const end = match ? match.index + match[0].length : text.length
      result += text.slice(position, end)
      position = end
      continue
    }
    if (text[position] === "`") {
      let openingEnd = position
      while (text[openingEnd] === "`") openingEnd++
      const runLength = openingEnd - position
      let end = openingEnd
      while (end < text.length && text[end] !== "\n") {
        if (text[end] !== "`") { end++; continue }
        const runStart = end
        let runEnd = end
        while (text[runEnd] === "`") runEnd++
        end = runEnd
        if (runEnd - runStart === runLength) break
      }
      result += text.slice(position, end)
      position = end
      continue
    }
    protectedSyntax.lastIndex = position
    taskMarker.lastIndex = position
    const marker = lineStart ? taskMarker.exec(text) : null
    const protectedMatch = property ?? marker ?? protectedSyntax.exec(text)
    if (protectedMatch) {
      result += protectedMatch[0]
      position += protectedMatch[0].length
      continue
    }

    let node: Trie | undefined = index
    let end = position
    let best: { end: number; name: string } | undefined
    const lastUnit = text.charCodeAt(position - 1)
    const previousPosition = lastUnit >= 0xdc00 && lastUnit <= 0xdfff ? position - 2 : position - 1
    const beforeCodePoint = text.codePointAt(previousPosition)
    const before = beforeCodePoint === undefined ? undefined : String.fromCodePoint(beforeCodePoint)
    if (boundary(before)) {
      while (end < text.length && node) {
        const char = String.fromCodePoint(text.codePointAt(end) ?? 0)
        node = node.children.get(char)
        if (!node) break
        end += char.length
        const afterCodePoint = text.codePointAt(end)
        const after = afterCodePoint === undefined ? undefined : String.fromCodePoint(afterCodePoint)
        if (node.name && boundary(after) && node.name.toLowerCase() !== currentPage.toLowerCase()) {
          best = { end, name: node.name }
        }
      }
    }
    if (best) {
      result += `[[${best.name}]]`
      position = best.end
    } else {
      const char = String.fromCodePoint(text.codePointAt(position) ?? 0)
      result += char
      position += char.length
    }
  }
  return result
}
