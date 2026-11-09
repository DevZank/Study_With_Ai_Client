import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Excalidraw,
  MainMenu,
  exportToBlob,
  restore,
} from "@excalidraw/excalidraw";
import type {
  ExcalidrawImperativeAPI,
  AppState,
  BinaryFiles,
} from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import "@excalidraw/excalidraw/index.css";
import { api, drawingSchema, sceneSchema, download, type Scene } from "./api";
import { useAutosave } from "./use-autosave";

// Fontes e recursos são servidos pela própria instalação, sem CDN.
window.EXCALIDRAW_ASSET_PATH = "/excalidraw/";

export function DrawingBoard({
  pageId,
  initial,
}: {
  pageId: string;
  initial: ReturnType<typeof drawingSchema.parse>;
}) {
  const client = useQueryClient();
  const [canvas, setCanvas] = useState<ExcalidrawImperativeAPI | null>(null),
    [exportError, setExportError] = useState("");
  const autosave = useAutosave<Scene>(
    "study:drawing:" + pageId,
    initial.scene,
    initial.version,
    sceneSchema,
    async (scene, version, id) => {
      const saved = await api(
        "/pages/" + pageId + "/drawing",
        drawingSchema,
        { scene, expected_version: version, operation_id: id },
        "PUT",
      );
      client.setQueryData(["drawing", pageId], saved);
      return saved;
    },
  );
  const restored = useMemo(
    () =>
      restore(
        {
          elements: autosave.value.elements as ExcalidrawElement[],
          appState: autosave.value.appState as Partial<AppState>,
          files: autosave.value.files as BinaryFiles,
        },
        null,
        null,
      ),
    [autosave.ready],
  );
  const changed = (
    elements: readonly ExcalidrawElement[],
    state: AppState,
    files: BinaryFiles,
  ) => {
    const scene = sceneSchema.parse({
      type: "excalidraw",
      version: 2,
      source: "study-local",
      elements,
      appState: {
        viewBackgroundColor: state.viewBackgroundColor,
        scrollX: state.scrollX,
        scrollY: state.scrollY,
        zoom: state.zoom,
      },
      files,
    });
    autosave.update(scene);
  };
  if (!autosave.ready) return <p role="status">Recuperando desenho…</p>;
  return (
    <section aria-label="Quadro de desenho">
      <h3>Quadro editável</h3>
      <p className="hint">
        Desenho local. Links externos e conteúdo incorporado não são permitidos.
        Até 2.000 elementos e imagens PNG/JPEG/WebP de até 500 KB cada.
      </p>
      <p role="status">{autosave.status}</p>
      {autosave.error && (
        <p role="alert">
          {autosave.error}{" "}
          <button onClick={autosave.retry}>Tentar salvar desenho</button>
          <button onClick={autosave.exportDraft}>
            Exportar rascunho do desenho
          </button>
          <button onClick={autosave.reload}>Recarregar desenho do banco</button>
        </p>
      )}
      {exportError && <p role="alert">{exportError}</p>}
      <div className="actions">
        <button
          onClick={() =>
            download(
              new Blob([JSON.stringify(autosave.value)], {
                type: "application/json",
              }),
              "quadro.excalidraw",
            )
          }
        >
          Exportar .excalidraw
        </button>
        <button
          disabled={!canvas}
          onClick={() => {
            if (!canvas) return;
            void exportToBlob({
              elements: canvas.getSceneElements(),
              appState: { ...canvas.getAppState(), exportBackground: true },
              files: canvas.getFiles(),
              mimeType: "image/png",
              maxWidthOrHeight: 4096,
            })
              .then((blob) => download(blob, "quadro.png"))
              .catch(() =>
                setExportError(
                  "Não foi possível exportar PNG. Verifique se há elementos no quadro.",
                ),
              );
          }}
        >
          Exportar PNG
        </button>
      </div>
      <div className="drawing-canvas">
        <Excalidraw
          initialData={restored}
          onChange={changed}
          excalidrawAPI={setCanvas}
          langCode="pt-BR"
          aiEnabled={false}
          isCollaborating={false}
          UIOptions={{
            canvasActions: {
              loadScene: false,
              saveToActiveFile: false,
              export: false,
              clearCanvas: false,
            },
            welcomeScreen: false,
          }}
          validateEmbeddable={() => false}
          onLinkOpen={(_element, e) => e.preventDefault()}
        >
          <MainMenu>
            <MainMenu.DefaultItems.ChangeCanvasBackground />
          </MainMenu>
        </Excalidraw>
      </div>
    </section>
  );
}
