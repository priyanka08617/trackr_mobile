import type { RmChecklist, RmDraft, RmQuestion, RmStore } from "../services/model";
export { useRmChecklistData } from "./useRmChecklistData";

export interface RmChecklistData {
  records: RmChecklist[];
  stores: RmStore[];
  questions: RmQuestion[];
  loading?: boolean;
  initialized?: boolean;
  error?: string;
  draft?: RmDraft;
  previousByStore?: Record<string, { scoring: number; nonScoring: number; ratings: Record<string, string> }>;
  onRefresh?: () => void;
  onLoadDetails?: (code: string) => Promise<void>;
  onLoadPrevious?: (storeId: string) => Promise<void>;
  onDelete?: (code: string) => Promise<void>;
  onSaveDraft?: (draft: RmDraft) => Promise<void>;
  onRemoveDraft?: () => Promise<void>;
  onSubmit?: (draft: RmDraft) => Promise<void>;
}
