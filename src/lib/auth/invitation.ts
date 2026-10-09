import nodemailer from "nodemailer";
import { z } from "zod";
import en from "../../../messages/en.json";
import ar from "../../../messages/ar.json";

// Validate delivery settings before creating an account. Never log email content.
export function invitationMailer() {
  const url = new URL(z.string().min(1).parse(process.env.LIVE_URL));
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
    (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))) {
    throw new Error("INVALID_LIVE_URL");
  }
  const host = z.string().trim().min(1).parse(process.env.SMTP_HOST);
  const port = z.coerce.number().int().min(1).max(65535).parse(process.env.SMTP_PORT ?? "587");
  const from = z.email().parse(process.env.SMTP_FROM);
  const user = z.string().min(1).parse(process.env.SMTP_USER);
  const pass = z.string().min(1).parse(process.env.SMTP_PASSWORD);
  const secure = port === 465;
  const transport = nodemailer.createTransport({
    host, port, secure, requireTLS: !secure, auth: { user, pass },
    connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000,
    disableFileAccess: true, disableUrlAccess: true, logger: false, debug: false,
  });
  return async (account: { name: string; email: string; password: string }, locale: string) => {
    const language = locale === "ar" ? "ar" : "en";
    const text = (language === "ar" ? ar : en).auth;
    const loginUrl = new URL(`/${language}/login`, url.origin).href;
    const result = await transport.sendMail({
      from, to: { name: account.name, address: account.email },
      subject: text.invitation_subject,
      text: [
        `${text.invitation_greeting} ${account.name},`,
        text.invitation_body,
        `${text.invitation_login}: ${loginUrl}`,
        `${text.email}: ${account.email}`,
        `${text.password}: ${account.password}`,
        text.invitation_change_password,
      ].join("\n\n"),
    });
    if (!result.accepted?.length || result.rejected?.length) throw new Error("INVITATION_REJECTED");
  };
}
