import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mail = vi.hoisted(() => ({ send: vi.fn(), transport: vi.fn() }));
vi.mock("nodemailer", () => ({ default: { createTransport: mail.transport } }));
import { invitationMailer } from "./invitation";

beforeEach(() => {
  vi.stubEnv("LIVE_URL", "https://cv.example.com");
  vi.stubEnv("SMTP_HOST", "smtp.example.com");
  vi.stubEnv("SMTP_PORT", "587");
  vi.stubEnv("SMTP_USER", "smtp-user");
  vi.stubEnv("SMTP_PASSWORD", "smtp-password");
  vi.stubEnv("SMTP_FROM", "invite@example.com");
  mail.transport.mockReturnValue({ sendMail: mail.send });
  mail.send.mockResolvedValue({ accepted: ["recipient@example.test"], rejected: [] });
});
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

const account = { name: "Recipient", email: "recipient@example.test", password: "Assigned-password-123" };

it("uses the public URL, localized text, and assigned credentials without putting secrets in links", async () => {
  await invitationMailer()(account, "ar");
  const message = mail.send.mock.calls[0][0];
  expect(message.to).toEqual({ name: account.name, address: account.email });
  expect(message.text).toContain("https://cv.example.com/ar/login");
  expect(message.text).toContain(account.password);
  expect(message.text).toContain(account.email);
  expect(message.subject).toContain("دعوتك");
  expect(message.text).toContain("غيّر كلمة المرور");
  expect(message.text).not.toContain("?password");
  expect(mail.transport).toHaveBeenCalledWith(expect.objectContaining({ secure: false, requireTLS: true, debug: false, logger: false }));
});

it("supports local links and SMTP over implicit TLS", async () => {
  vi.stubEnv("LIVE_URL", "http://localhost:3000");
  vi.stubEnv("SMTP_PORT", "465");
  await invitationMailer()(account, "en");
  expect(mail.send.mock.calls[0][0].text).toContain("http://localhost:3000/en/login");
  expect(mail.transport).toHaveBeenCalledWith(expect.objectContaining({ secure: true, requireTLS: false }));
});

it("rejects incomplete mail configuration and unsafe public URLs", () => {
  for (const url of ["", "http://cv.example.com", "https://cv.example.com/path", "https://user:secret@cv.example.com", "https://cv.example.com?secret=value"]) {
    vi.stubEnv("LIVE_URL", url);
    expect(() => invitationMailer()).toThrow();
  }
  vi.stubEnv("LIVE_URL", "https://cv.example.com");
  vi.stubEnv("SMTP_PASSWORD", "");
  expect(() => invitationMailer()).toThrow();
  expect(mail.send).not.toHaveBeenCalled();
});

it("reports rejection and transport failures rather than claiming an invitation was sent", async () => {
  mail.send.mockResolvedValueOnce({ accepted: [], rejected: [account.email] });
  await expect(invitationMailer()(account, "en")).rejects.toThrow("INVITATION_REJECTED");
  mail.send.mockRejectedValueOnce(new Error("SMTP_UNAVAILABLE"));
  await expect(invitationMailer()(account, "en")).rejects.toThrow("SMTP_UNAVAILABLE");
});
