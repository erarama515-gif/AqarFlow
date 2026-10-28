import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';

/**
 * PasswordService
 *
 * Wraps Argon2id with a tenant-wide pepper. The pepper is concatenated to
 * the password before hashing — combined with the per-hash salt this defends
 * against attackers who steal only the database but not the application
 * secret.
 *
 * Argon2id parameters (memory=64MB, iter=3, parallel=4) follow OWASP 2024
 * guidance.
 */
@Injectable()
export class PasswordService {
  private readonly pepper: string;

  constructor(config: ConfigService) {
    this.pepper = config.get<string>('app.auth.pepper')!;
  }

  async hash(plain: string): Promise<string> {
    return argon2.hash(plain + this.pepper, {
      type: argon2.argon2id,
      memoryCost: 64 * 1024, // 64 MiB
      timeCost: 3,
      parallelism: 4,
    });
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    if (!hash) return false;
    try {
      return await argon2.verify(hash, plain + this.pepper);
    } catch {
      return false;
    }
  }

  /**
   * Quick policy check used by the registration endpoint. Returns the first
   * issue found, or null if the password is acceptable.
   */
  validatePolicy(plain: string): string | null {
    if (plain.length < 8) return 'Password must be at least 8 characters';
    if (!/[a-z]/.test(plain)) return 'Password must contain a lowercase letter';
    if (!/[A-Z]/.test(plain)) return 'Password must contain an uppercase letter';
    if (!/[0-9]/.test(plain)) return 'Password must contain a digit';
    return null;
  }
}
