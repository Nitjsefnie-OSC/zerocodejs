import type { SerializedSelection } from './selection';

export interface HistoryEntry {
  html: string;
  selection: SerializedSelection | null;
}

/**
 * 元に戻す・やり直しの履歴。ブラウザ標準の Undo は自前の DOM 操作を記録しないため、
 * 内容と選択位置のスナップショットで管理する。
 */
export class RichTextHistory {
  private entries: HistoryEntry[] = [];
  private index = -1;

  constructor(private readonly limit = 100) {}

  reset(entry: HistoryEntry): void {
    this.entries = [entry];
    this.index = 0;
  }

  /** 内容が直前と同じなら選択位置だけ更新し、false を返す */
  record(entry: HistoryEntry): boolean {
    const current = this.entries[this.index];
    if (current && current.html === entry.html) {
      current.selection = entry.selection;
      return false;
    }
    this.entries.length = this.index + 1;
    this.entries.push(entry);
    if (this.entries.length > this.limit) this.entries.shift();
    this.index = this.entries.length - 1;
    return true;
  }

  undo(): HistoryEntry | null {
    if (!this.canUndo) return null;
    this.index -= 1;
    return this.entries[this.index];
  }

  redo(): HistoryEntry | null {
    if (!this.canRedo) return null;
    this.index += 1;
    return this.entries[this.index];
  }

  get canUndo(): boolean {
    return this.index > 0;
  }

  get canRedo(): boolean {
    return this.index < this.entries.length - 1;
  }
}
