import {
  useEditor,
  EditorContent,
  ReactNodeViewRenderer,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { Node, mergeAttributes, type JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import { Formula } from "../content/Formula";
import type { RichDocument } from "./api";

function FormulaView({ node }: NodeViewProps) {
  return (
    <NodeViewWrapper className="note-formula">
      <Formula latex={String(node.attrs.latex)} />
    </NodeViewWrapper>
  );
}
const MathNode = Node.create({
  name: "formula",
  group: "block",
  atom: true,
  addAttributes() {
    return { latex: { default: "" } };
  },
  parseHTML() {
    return [{ tag: "div[data-note-formula]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-note-formula": "" }),
      String(HTMLAttributes.latex),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(FormulaView);
  },
});

export function RichEditor({
  value,
  onChange,
}: {
  value: RichDocument;
  onChange: (v: RichDocument) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: false, linkOnPaste: false },
      }),
      TableKit.configure({ table: { resizable: false } }),
      MathNode,
    ],
    content: value as JSONContent,
    editorProps: {
      attributes: {
        "aria-label": "Conteúdo da página",
        role: "textbox",
        "aria-multiline": "true",
      },
      handlePaste(view, event) {
        const text = event.clipboardData?.getData("text/plain");
        if (text !== undefined) {
          event.preventDefault();
          view.dispatch(view.state.tr.insertText(text));
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON() as RichDocument),
  });
  if (!editor) return <p role="status">Abrindo editor…</p>;
  return (
    <div className="note-editor">
      <div
        role="toolbar"
        aria-label="Formatação do caderno"
        className="actions"
      >
        <button
          type="button"
          aria-pressed={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          Negrito
        </button>
        <button
          type="button"
          aria-pressed={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          Itálico
        </button>
        <button
          type="button"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          Título
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          Lista
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          Lista numerada
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          Código
        </button>
        <button
          type="button"
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 2, cols: 2, withHeaderRow: true })
              .run()
          }
        >
          Inserir tabela
        </button>
        <button
          type="button"
          disabled={!editor.isActive("table")}
          onClick={() => editor.chain().focus().addRowAfter().run()}
        >
          Adicionar linha
        </button>
        <button
          type="button"
          onClick={() => {
            const latex = prompt("Fórmula em LaTeX (até 2.000 caracteres)");
            if (latex && latex.length <= 2000)
              editor
                .chain()
                .focus()
                .insertContent({ type: "formula", attrs: { latex } })
                .run();
          }}
        >
          Inserir fórmula
        </button>
        <button
          type="button"
          onClick={() => {
            const href = prompt(
              "Link https://, http://, mailto: ou #/notebooks/…",
            );
            if (href && /^(https?:\/\/|mailto:|#\/notebooks\/)/.test(href))
              editor.chain().focus().setLink({ href }).run();
          }}
        >
          Inserir link
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetLink().run()}
        >
          Remover link
        </button>
        <button
          type="button"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          Desfazer texto
        </button>
        <button
          type="button"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          Refazer texto
        </button>
      </div>
      <EditorContent editor={editor} />
      <p className="hint">
        Colagens entram como texto. Código e fórmulas não são executados.
        Imagens locais podem ser inseridas no quadro.
      </p>
    </div>
  );
}
