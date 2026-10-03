/** Small authenticated OAuth completion document for the audit's sign-in window. */
export function auditOAuthCompletion(payload: { siteId: string; error?: string }, origin: string, nonce: string) {
  const message = JSON.stringify({ type: "ghost-ga4-result", ...payload }).replace(/</g, "\\u003c");
  const target = JSON.stringify(origin).replace(/</g, "\\u003c");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Google Analytics · Ghost</title></head>
<body><p>You can close this window and return to your audit to continue.</p>
<script nonce="${nonce}">if(window.opener){window.opener.postMessage(${message},${target});window.close();}</script></body></html>`;
}
