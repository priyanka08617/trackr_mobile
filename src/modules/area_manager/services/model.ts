export interface RmStore { id: string; name: string; region: string; zone: string; }
export interface RmRating { label: string; mark: number; }
export interface RmQuestion {
  id: string;
  category: string;
  text: string;
  ratings: RmRating[];
  reasons: string[];
  chooseCompliance: string;
}
export interface RmAnswer { questionId: string; rating: string; reason: string; remark: string; }
export interface RmDetail extends RmAnswer {
  question: string; category: string; mark: number; pointStatus?: string; storeRemark?: string;
}
export interface RmChecklist {
  code: string; date: string; store: string; manager: string; createdOn: string;
  status: 1 | 2;
  details: RmDetail[];
  detailsLoaded?: boolean;
}
export interface RmDraft { code?: string; date: string; storeId: string; answers: RmAnswer[]; }

export function checklistApiDate(value: string): string {
  const date = value.replace(/^(\d{2})-(\d{2})-(\d{4})$/, "$3-$2-$1");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid checklist date. Reload the checklist and try again.");
  }
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date) {
    throw new Error("Invalid checklist date. Reload the checklist and try again.");
  }
  return date;
}

export function getAnswerError(question: RmQuestion, answer?: RmAnswer): string | undefined {
  const rating = question.ratings.find((option) => option.label === answer?.rating);
  if (!rating) return "Choose a rating.";
  if (rating.label === question.chooseCompliance) {
    if (!answer?.reason || !question.reasons.includes(answer.reason)) return "Choose a reason.";
    if (answer.remark.trim().length < 60) return "Enter a remark of at least 60 characters.";
  }
  return undefined;
}

export function getScore(questions: RmQuestion[], answers: RmAnswer[]) {
  let scoring = 0;
  let nonScoring = 0;
  for (const question of questions) {
    const answer = answers.find((item) => item.questionId === question.id);
    const rating = question.ratings.find((item) => item.label === answer?.rating);
    if (rating && rating.mark > 0) scoring += rating.mark;
    if (rating && rating.mark === 0) nonScoring++;
  }
  return { scoring, nonScoring };
}

export function todayForChecklist() {
  const date = new Date();
  return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
}
