"use client"

import { cn } from "@/lib/utils"
import { createEditorExtension } from "@/registry/editor/editor"
import { Extension, InputRule, mergeAttributes, Node } from "@tiptap/core"
import { PluginKey } from "@tiptap/pm/state"
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  ReactRenderer,
  type NodeViewProps,
} from "@tiptap/react"
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion"
import { Braces } from "lucide-react"
import * as React from "react"
import tippy, { type Instance, type Props } from "tippy.js"

import { useContractMetaStore } from "./contract-meta-store"
import {
  CONTRACT_VARIABLES,
  findVariableByQuery,
  isContractVariableKey,
  resolveContractVariable,
  type ContractVariableDef,
  type ContractVariableKey,
} from "./contract-variables"

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    contractVariable: {
      insertContractVariable: (key: ContractVariableKey) => ReturnType
    }
  }
}

function ContractVariableView({ node }: NodeViewProps) {
  const meta = useContractMetaStore()
  const key = String(node.attrs.key ?? "")
  const valid = isContractVariableKey(key)
  const display = valid
    ? resolveContractVariable(meta, key)
    : `{${key || "?"}}`
  const empty = valid && display === `{${key}}`

  return (
    <NodeViewWrapper
      as="span"
      className={cn(
        "contract-variable",
        empty && "contract-variable--empty"
      )}
      data-key={key}
      contentEditable={false}
    >
      {display}
    </NodeViewWrapper>
  )
}

const ContractVariableNode = Node.create({
  name: "contractVariable",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      key: {
        default: "nilai",
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute("data-key") ?? "nilai",
        renderHTML: (attrs) => ({ "data-key": attrs.key }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="contract-variable"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "contract-variable",
        class: "contract-variable",
      }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ContractVariableView)
  },

  addCommands() {
    return {
      insertContractVariable:
        (key: ContractVariableKey) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { key },
          }),
    }
  },

  addInputRules() {
    return [
      new InputRule({
        find: /\{(judul|pihak1|pihak2|tanggal|nilai)\}$/,
        handler: ({ state, range, match }) => {
          const key = match[1]
          if (!isContractVariableKey(key)) return
          const { tr } = state
          tr.replaceWith(range.from, range.to, this.type.create({ key }))
        },
      }),
    ]
  },
})

interface VariableListProps {
  items: ContractVariableDef[]
  command: (item: ContractVariableDef) => void
}

interface VariableListRef {
  onKeyDown: (event: KeyboardEvent) => boolean
}

const VariableList = React.forwardRef<VariableListRef, VariableListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = React.useState(0)

    React.useEffect(() => {
      setSelectedIndex(0)
    }, [items])

    React.useImperativeHandle(ref, () => ({
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((i) => (i <= 0 ? items.length - 1 : i - 1))
          return true
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((i) => (i >= items.length - 1 ? 0 : i + 1))
          return true
        }
        if (event.key === "Enter") {
          const item = items[selectedIndex]
          if (item) command(item)
          return true
        }
        return false
      },
    }))

    if (items.length === 0) {
      return (
        <div className="text-muted-foreground p-3 text-center text-sm">
          Tidak ada variabel
        </div>
      )
    }

    return (
      <div className="bg-popover max-h-[240px] overflow-auto rounded-md border p-1 shadow-md">
        {items.map((item, index) => (
          <button
            key={item.key}
            type="button"
            onClick={() => command(item)}
            className={cn(
              "flex w-full min-w-[220px] cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none",
              index === selectedIndex
                ? "bg-accent text-accent-foreground"
                : "hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <span className="border-border bg-background/40 flex size-7 items-center justify-center rounded-md border">
              <Braces className="size-3.5 opacity-60" />
            </span>
            <span className="flex flex-col">
              <span className="font-medium">{item.label}</span>
              <span className="text-muted-foreground text-xs">
                @{item.token} · {`{${item.token}}`}
              </span>
            </span>
          </button>
        ))}
      </div>
    )
  }
)
VariableList.displayName = "VariableList"

function createVariableSuggestion(): Omit<SuggestionOptions, "editor"> {
  return {
    char: "@",
    pluginKey: new PluginKey("contractVariableSuggestion"),
    allowSpaces: false,
    items: ({ query }) => findVariableByQuery(query),
    command: ({ editor, range, props }) => {
      const item = props as ContractVariableDef
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContractVariable(item.key)
        .run()
    },
    render: () => {
      let component: ReactRenderer<VariableListRef> | null = null
      let popup: Instance<Props>[] | null = null

      return {
        onStart: (props) => {
          component = new ReactRenderer(VariableList, {
            props: {
              items: props.items,
              command: props.command,
            },
            editor: props.editor,
          })

          if (!props.clientRect) return

          popup = tippy("body", {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: "manual",
            placement: "bottom-start",
            animation: "shift-toward-subtle",
            theme: "contract-variable-menu",
          })
        },
        onUpdate: (props) => {
          component?.updateProps({
            items: props.items,
            command: props.command,
          })
          if (!props.clientRect || !popup?.[0]) return
          popup[0].setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          })
        },
        onKeyDown: (props) => {
          if (props.event.key === "Escape") {
            popup?.[0]?.hide()
            return true
          }
          return component?.ref?.onKeyDown(props.event) ?? false
        },
        onExit: () => {
          popup?.[0]?.destroy()
          component?.destroy()
        },
      }
    },
  }
}

const ContractVariableMention = Extension.create({
  name: "contractVariableMention",

  onCreate() {
    injectVariableStyles()
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...createVariableSuggestion(),
      }),
    ]
  },
})

const VARIABLE_STYLES = `
  .contract-variable {
    display: inline;
    padding: 0 0.15em;
    border-radius: 0.2em;
    background: color-mix(in oklab, hsl(var(--foreground)) 6%, transparent);
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
    border-bottom: 1.5px solid color-mix(in oklab, hsl(var(--foreground)) 28%, transparent);
    font-weight: 600;
    white-space: nowrap;
    cursor: default;
  }
  .contract-variable--empty {
    color: hsl(var(--muted-foreground));
    font-weight: 500;
    font-style: italic;
    border-bottom-style: dashed;
  }
  .ProseMirror-selectednode.contract-variable,
  .ProseMirror-selectednode .contract-variable {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 1px;
  }
  .tippy-box[data-theme~='contract-variable-menu'] {
    background-color: transparent;
    border: none;
    box-shadow: none;
  }
  .tippy-box[data-theme~='contract-variable-menu'] .tippy-content {
    padding: 0;
  }
  @media print {
    .contract-variable {
      background: transparent;
      border-bottom: none;
      font-weight: inherit;
      padding: 0;
    }
  }
`

const STYLE_ID = "editor-contract-variable-styles"

function injectVariableStyles() {
  if (typeof document === "undefined") return
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement("style")
  style.id = STYLE_ID
  style.textContent = VARIABLE_STYLES
  document.head.appendChild(style)
}

export const EditorContractVariableExtension = createEditorExtension({
  extension: [ContractVariableNode, ContractVariableMention],
  commands: CONTRACT_VARIABLES.map((v) => ({
    key: `variable-${v.key}`,
    icon: Braces,
    label: v.label,
    description: `Sisipkan {${v.token}}`,
    execute: (editor) =>
      editor.chain().focus().insertContractVariable(v.key).run(),
    canExecute: () => true,
  })),
})
