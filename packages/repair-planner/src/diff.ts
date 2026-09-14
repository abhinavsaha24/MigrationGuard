import { SchemaDiffEntry } from '@migrationguard/core';

export function computeSchemaDiff(before: string, after: string): SchemaDiffEntry[] {
  const beforeLines = before.split(/\r?\n/);
  const afterLines = after.split(/\r?\n/);
  const diff: SchemaDiffEntry[] = [];

  const maxLines = Math.max(beforeLines.length, afterLines.length);
  let bIdx = 0;
  let aIdx = 0;

  while (bIdx < beforeLines.length || aIdx < afterLines.length) {
    const bLine = beforeLines[bIdx];
    const aLine = afterLines[aIdx];

    if (bLine === aLine) {
      if (bLine !== undefined) {
        diff.push({ line: aIdx + 1, type: 'CONTEXT', content: bLine });
      }
      bIdx++;
      aIdx++;
    } else {
      // Simple line diff detection
      const nextMatchingInAfter = afterLines.indexOf(bLine, aIdx);
      const nextMatchingInBefore = beforeLines.indexOf(aLine, bIdx);

      if (
        nextMatchingInAfter !== -1 &&
        (nextMatchingInBefore === -1 || nextMatchingInAfter - aIdx <= nextMatchingInBefore - bIdx)
      ) {
        // Lines added in after
        while (aIdx < nextMatchingInAfter) {
          diff.push({ line: aIdx + 1, type: 'ADD', content: afterLines[aIdx] });
          aIdx++;
        }
      } else if (nextMatchingInBefore !== -1) {
        // Lines removed in after
        while (bIdx < nextMatchingInBefore) {
          diff.push({ line: bIdx + 1, type: 'REMOVE', content: beforeLines[bIdx] });
          bIdx++;
        }
      } else {
        if (bIdx < beforeLines.length) {
          diff.push({ line: bIdx + 1, type: 'REMOVE', content: beforeLines[bIdx] });
          bIdx++;
        }
        if (aIdx < afterLines.length) {
          diff.push({ line: aIdx + 1, type: 'ADD', content: afterLines[aIdx] });
          aIdx++;
        }
      }
    }
  }

  return diff;
}
