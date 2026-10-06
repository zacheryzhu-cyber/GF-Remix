/**
 * Gmail API Client Service
 * Sends RFC 2822 email messages via the official Google Workspace Gmail REST API.
 */

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  accessToken: string;
}

export interface SendEmailResult {
  id: string;
  threadId: string;
  labelIds?: string[];
}

/**
 * Encodes an email into base64url formatted RFC 2822 standard string.
 */
function makeRawEmail(to: string, subject: string, body: string): string {
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const messageParts = [
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    body,
  ];
  const message = messageParts.join('\r\n');

  // Convert binary/UTF-8 string to base64, then format as URL-safe base64
  return btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Sends an email using the Gmail REST API endpoint.
 */
export const sendGmailMessage = async ({
  to,
  subject,
  body,
  accessToken,
}: SendEmailParams): Promise<SendEmailResult> => {
  if (!accessToken) {
    throw new Error('Missing Google OAuth access token. Please authenticate first.');
  }

  const raw = makeRawEmail(to, subject, body);

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    let errorMessage =
      errorData?.error?.message || `Gmail API Error: HTTP ${response.status} (${response.statusText})`;
    
    if (errorMessage.toLowerCase().includes('mail service not enabled')) {
      errorMessage =
        'Mail service not enabled: The signed-in Google account does not have an active Gmail mailbox (common for Google accounts registered with external domains like Yahoo, Outlook, or iCloud). Please switch to an account ending with @gmail.com, or use the direct mail fallback below.';
    }
    throw new Error(errorMessage);
  }

  return (await response.json()) as SendEmailResult;
};
