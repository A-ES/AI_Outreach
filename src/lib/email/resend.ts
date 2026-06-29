interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
}

interface SendEmailResult {
  id: string;
}

/** Sends email via Resend — only call from explicit user-approved send action. */
export async function sendViaResend(
  params: SendEmailParams
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  if (!from) throw new Error("RESEND_FROM_EMAIL is not configured");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: params.to,
      subject: params.subject,
      text: params.body,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? String((data as { message?: string }).message)
        : `Resend API error (${response.status})`;
    throw new Error(message);
  }

  return { id: String((data as { id?: string }).id ?? "") };
}
