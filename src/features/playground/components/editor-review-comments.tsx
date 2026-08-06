"use client"

import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"
import { createEditorExtension } from "@/registry/editor/editor"
import type { ContractComment } from "./contract-draft"

const reviewCommentsKey = new PluginKey<{
  comments: ContractComment[]
  activeId: string | null
}>("reviewComments")

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    reviewComments: {
      setReviewComments: (comments: ContractComment[]) => ReturnType
      setActiveReviewComment: (id: string | null) => ReturnType
    }
  }

  interface Storage {
    reviewComments: {
      comments: ContractComment[]
      activeId: string | null
    }
  }
}

type ReviewMeta = {
  comments?: ContractComment[]
  activeId?: string | null
}

function buildDecorations(
  doc: Parameters<typeof DecorationSet.create>[0],
  comments: ContractComment[],
  activeId: string | null
) {
  const decos = []
  const size = doc.content.size
  for (const c of comments) {
    if (c.status === "resolved") continue
    if (c.from < 0 || c.to > size || c.from >= c.to) continue
    const active = activeId === c.id
    decos.push(
      Decoration.inline(c.from, c.to, {
        class: active
          ? "review-comment-mark review-comment-mark--active"
          : "review-comment-mark",
        "data-comment-id": c.id,
      })
    )
  }
  return DecorationSet.create(doc, decos)
}

const REVIEW_COMMENT_STYLES = `
  .ProseMirror .review-comment-mark {
    background-color: color-mix(in oklab, #fbbf24 35%, transparent);
    border-bottom: 2px solid color-mix(in oklab, #d97706 70%, transparent);
  }
  .ProseMirror .review-comment-mark--active {
    background-color: color-mix(in oklab, #fbbf24 55%, transparent);
    border-bottom-color: #b45309;
  }
`

let stylesInjected = false
function injectStyles() {
  if (stylesInjected || typeof document === "undefined") return
  const style = document.createElement("style")
  style.id = "review-comment-styles"
  style.textContent = REVIEW_COMMENT_STYLES
  document.head.appendChild(style)
  stylesInjected = true
}

const ReviewComments = Extension.create({
  name: "reviewComments",

  addStorage() {
    return {
      comments: [] as ContractComment[],
      activeId: null as string | null,
    }
  },

  onCreate() {
    injectStyles()
  },

  addCommands() {
    return {
      setReviewComments:
        (comments) =>
        ({ editor, tr, dispatch }) => {
          editor.storage.reviewComments.comments = comments
          if (dispatch) {
            dispatch(
              tr.setMeta(reviewCommentsKey, {
                comments,
                activeId: editor.storage.reviewComments.activeId,
              } satisfies ReviewMeta)
            )
          }
          return true
        },
      setActiveReviewComment:
        (id) =>
        ({ editor, tr, dispatch }) => {
          editor.storage.reviewComments.activeId = id
          if (dispatch) {
            dispatch(
              tr.setMeta(reviewCommentsKey, {
                comments: editor.storage.reviewComments.comments,
                activeId: id,
              } satisfies ReviewMeta)
            )
          }
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: reviewCommentsKey,
        state: {
          init: () => ({ comments: [] as ContractComment[], activeId: null as string | null }),
          apply: (tr, prev) => {
            const meta = tr.getMeta(reviewCommentsKey) as ReviewMeta | undefined
            if (meta?.comments || meta?.activeId !== undefined) {
              return {
                comments: meta.comments ?? prev.comments,
                activeId:
                  meta.activeId !== undefined ? meta.activeId : prev.activeId,
              }
            }
            return prev
          },
        },
        props: {
          decorations(state) {
            const data = reviewCommentsKey.getState(state)
            if (!data) return null
            return buildDecorations(state.doc, data.comments, data.activeId)
          },
        },
      }),
    ]
  },
})

export const EditorReviewCommentsExtension = createEditorExtension({
  extension: ReviewComments,
})
