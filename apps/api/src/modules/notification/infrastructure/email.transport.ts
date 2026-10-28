import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Wraps nodemailer in a thin service. Defaults to a local Mailpit container
 * in dev (no signup, free), and accepts any SMTP credentials in production.
 * We deliberately avoid SaaS email providers in MVP so the deployment has
 * zero paid dependencies.
 */
@Injectable()
export class EmailTransport implements OnModuleInit {
  private readonly logger = new Logger(EmailTransport.name);
  private transporter!: nodemailer.Transporter;
  private from!: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('app.smtp.host'),
      port: this.config.get<number>('app.smtp.port'),
      secure: this.config.get<boolean>('app.smtp.secure'),
      auth: this.config.get<string>('app.smtp.user')
        ? {
            user: this.config.get<string>('app.smtp.user'),
            pass: this.config.get<string>('app.smtp.pass'),
          }
        : undefined,
    });
    this.from = this.config.get<string>('app.smtp.from', 'AqarFlow <noreply@aqarflow.local>');
  }

  async send(to: string, subject: string, html: string, text?: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html,
        text: text ?? this.stripHtml(html),
      });
    } catch (err) {
      this.logger.warn(`Email send failed for ${to}: ${(err as Error).message}`);
      throw err;
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  }
}
