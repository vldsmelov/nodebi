import { create } from "zustand";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

type WorkflowUiState = {
  selectedNodeId: string | null;
  saveStatus: SaveStatus;
  saveError: string | null;
  selectNode: (nodeId: string | null) => void;
  setSaveState: (status: SaveStatus, error?: string | null) => void;
};

export const useWorkflowUi = create<WorkflowUiState>((set) => ({
  selectedNodeId: null,
  saveStatus: "idle",
  saveError: null,
  selectNode: (selectedNodeId) => set({ selectedNodeId }),
  setSaveState: (saveStatus, saveError = null) => set({ saveStatus, saveError }),
}));
