import { Injectable } from '@nestjs/common';
import * as Diff from 'diff';

export interface DiffChunk {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
  lines: string[];
}

@Injectable()
export class DiffService {
  computeLineDiff(oldText: string, newText: string): DiffChunk[] {
    const normalized = (t: string) => t.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const changes = Diff.diffLines(normalized(oldText), normalized(newText));
    return changes.map((change) => ({
      type: change.added ? 'added' : change.removed ? 'removed' : 'unchanged',
      value: change.value,
      lines: change.value.split('\n').filter((l, i, arr) => i < arr.length - 1 || l !== ''),
    }));
  }

  computeWordDiff(oldText: string, newText: string): DiffChunk[] {
    const changes = Diff.diffWords(oldText, newText);
    return changes.map((change) => ({
      type: change.added ? 'added' : change.removed ? 'removed' : 'unchanged',
      value: change.value,
      lines: [change.value],
    }));
  }
}
