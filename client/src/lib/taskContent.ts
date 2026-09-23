import type { ChecklistItem, ChecklistItemStatus, TaskContent } from '../types';

export function generateItemId(): string {
  return 'chk_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

/**
 * Parses task.description into structured TaskContent.
 * Handles:
 * 1. null / undefined / empty string -> null
 * 2. JSON checklist: {"type":"checklist", "checklist":[{"status":"done"|"not done", "description":"..."}]}
 * 3. JSON description: {"type":"description", "description":"..."}
 * 4. Legacy plain text strings: "buy milk" -> { type: 'description', description: "buy milk" }
 */
export function parseTaskContent(raw: string | null | undefined): TaskContent | null {
  if (!raw || !raw.trim()) {
    return null;
  }

  const trimmed = raw.trim();

  // If it doesn't look like JSON, treat as legacy description
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return {
      type: 'description',
      description: trimmed,
    };
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') {
      if (parsed.type === 'checklist' && Array.isArray(parsed.checklist)) {
        const checklist: ChecklistItem[] = parsed.checklist.map((item: any, idx: number) => {
          const status: ChecklistItemStatus =
            item?.status === 'done' || item?.status === 'completed' || item?.status === true
              ? 'done'
              : 'not done';
          const description =
            typeof item?.description === 'string'
              ? item.description
              : typeof item?.text === 'string'
              ? item.text
              : typeof item?.title === 'string'
              ? item.title
              : '';
          const id =
            typeof item?.id === 'string' && item.id
              ? item.id
              : `chk_${idx}_${Math.random().toString(36).slice(2, 7)}`;
          return { id, status, description };
        });
        return {
          type: 'checklist',
          checklist,
        };
      }

      if (parsed.type === 'description') {
        return {
          type: 'description',
          description: typeof parsed.description === 'string' ? parsed.description : '',
        };
      }
    }
  } catch {
    // Not valid JSON, fallback to plain text description
  }

  return {
    type: 'description',
    description: trimmed,
  };
}

/**
 * Serializes TaskContent into JSON string to be stored in tasks.description.
 * Always formats as JSON:
 * - { "type": "description", "description": "..." }
 * - { "type": "checklist", "checklist": [{ "status": "done" | "not done", "description": "..." }] }
 */
export function serializeTaskContent(content: TaskContent | null): string | null {
  if (!content) return null;

  if (content.type === 'description') {
    const trimmed = content.description.trim();
    if (!trimmed) return null;
    return JSON.stringify({
      type: 'description',
      description: trimmed,
    });
  }

  if (content.type === 'checklist') {
    const cleanItems = content.checklist
      .map((item) => ({
        id: item.id || generateItemId(),
        status: (item.status === 'done' ? 'done' : 'not done') as ChecklistItemStatus,
        description: item.description.trim(),
      }))
      .filter((item) => item.description.length > 0);

    if (cleanItems.length === 0) {
      return null;
    }

    return JSON.stringify({
      type: 'checklist',
      checklist: cleanItems,
    });
  }

  return null;
}

export function getChecklistStats(items: ChecklistItem[]): {
  total: number;
  done: number;
  allDone: boolean;
} {
  const total = items.length;
  const done = items.filter((item) => item.status === 'done').length;
  return {
    total,
    done,
    allDone: total > 0 && done === total,
  };
}
