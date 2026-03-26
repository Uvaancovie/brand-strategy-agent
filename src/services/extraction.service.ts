// ─── EXTRACTION SERVICE ─────────────────────────────────────────────
// Applies parsed JSON extractions to the brandscript state

import { state } from '../store/brandscript.store';
import type { Extraction } from '../config/framework';

export function applyExtractions(extractions: Extraction[]): void {
  for (const ext of extractions) {
    const section = state.brandscript[ext.section as keyof typeof state.brandscript];
    if (section && section[ext.field] !== undefined) {
      section[ext.field] = ext.value;
    }
  }
}
