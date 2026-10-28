import { Injectable } from '@nestjs/common';

/**
 * ArabicNameNormalizer
 *
 * Names in Arabic are notorious for spelling drift:
 *   محمد / محمّد / مُحمد   — diacritics
 *   احمد / أحمد / إحمد    — Hamza forms
 *   مدينة / مدينه         — Ta marbuta vs Heh
 *   على / علي              — Alef maksura vs Ya
 *
 * For dedup we collapse all these variants to one canonical form. Result is
 * intended only for matching (`full_name_normalized`), not for display.
 */
@Injectable()
export class ArabicNameNormalizer {
  normalize(input: string | undefined | null): string | null {
    if (!input) return null;
    return input
      .normalize('NFKD')
      // Strip tashkeel (diacritics)
      .replace(/[ً-ٰٟ]/g, '')
      // Tatweel (kashida)
      .replace(/ـ/g, '')
      // Alef variants → ا
      .replace(/[آأإٱ]/g, 'ا')
      // Ya variants → ي
      .replace(/ى/g, 'ي')
      // Ta marbuta → ha
      .replace(/ة/g, 'ه')
      // Strip common honorifics
      .replace(/^(الدكتور|الدكتوره|الاستاذ|الاستاذه|المهندس|المهندسه|د\.|م\.|أ\.|الشيخ|الحاج)\s*/i, '')
      // Collapse whitespace
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }
}
