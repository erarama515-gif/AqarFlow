import { Injectable } from '@nestjs/common';
import { CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * PhoneNormalizer
 *
 * Real-estate agents in MENA enter the same phone number a dozen different
 * ways:
 *   "0501234567"          (Saudi local with leading zero)
 *   "00966501234567"      (international with 00 prefix)
 *   "+966 50 123 4567"    (E.164 with spaces)
 *   "501234567"           (no country code at all)
 *
 * Without normalization, the lead dedup logic collapses. Every record passes
 * through `normalize(raw, defaultCountry)` so we store one canonical E.164
 * representation in `phone_normalized` and key all uniqueness on it.
 */
@Injectable()
export class PhoneNormalizerService {
  /**
   * Returns canonical E.164 (e.g., "+966501234567") or null if unparseable.
   * `defaultCountry` is the tenant's country, used to bridge inputs without
   * a country code.
   */
  normalize(raw: string | undefined | null, defaultCountry: CountryCode): string | null {
    if (!raw) return null;
    const cleaned = this.preClean(raw);
    if (!cleaned) return null;

    const parsed = parsePhoneNumberFromString(cleaned, defaultCountry);
    if (!parsed || !parsed.isValid()) return null;
    return parsed.number; // E.164
  }

  /**
   * Lighter pre-cleaner that also strips common typo patterns. Returns
   * something parseable but doesn't validate.
   */
  private preClean(raw: string): string {
    let s = raw.trim();
    // Convert Arabic-Indic digits to ASCII (٠١٢٣٤٥٦٧٨٩ → 0123456789)
    s = s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
    s = s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    // Drop spaces, dashes, parentheses, non-breaking whitespace
    s = s.replace(/[\s\-() ]/g, '');
    // 00 → + (international prefix variants)
    if (s.startsWith('00')) s = `+${s.slice(2)}`;
    return s;
  }
}
