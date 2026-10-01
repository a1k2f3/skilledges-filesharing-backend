const normalizeWhatsappNumber = (value) => {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const digitsOnly = trimmed.replace(/\D/g, "");
  if (!digitsOnly || digitsOnly.length < 8 || digitsOnly.length > 15) {
    return null;
  }

  return `+${digitsOnly.startsWith("0") ? digitsOnly.replace(/^0+/, "") : digitsOnly}`;
};

const buildFileShareWhatsAppMessage = ({ recipientName, senderName, files = [], fileCount }) => {
  const fileEntries = (Array.isArray(files) ? files : [files])
    .filter(Boolean)
    .map((file) => (typeof file === "string" ? file : file.originalName || file.name || "file"));

  const totalFiles = Number.isFinite(fileCount) && fileCount > 0 ? fileCount : fileEntries.length || 1;
  const preview = fileEntries.slice(0, 3);
  const suffix = preview.length ? `: ${preview.join(", ")}${fileEntries.length > 3 ? " and more" : ""}` : "";

  return `Hello ${recipientName || "there"}, ${senderName || "Admin"} sent you ${totalFiles} file${totalFiles === 1 ? "" : "s"}${suffix}.`;
};

const sendFileShareWhatsAppMessage = async ({ recipientNumber, recipientName, senderName, files, fileCount = 1 }) => {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    return { sent: false, reason: "not-configured" };
  }

  const normalizedNumber = normalizeWhatsappNumber(recipientNumber);
  if (!normalizedNumber) {
    return { sent: false, reason: "invalid-number" };
  }

  const version = process.env.WHATSAPP_API_VERSION || "v20.0";
  const message = buildFileShareWhatsAppMessage({
    recipientName,
    senderName,
    files,
    fileCount
  });

  const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalizedNumber,
      type: "text",
      text: {
        body: message,
        preview_url: false
      }
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMessage = payload?.error?.message || "Unable to send WhatsApp message";
    throw new Error(errorMessage);
  }

  return {
    sent: true,
    messageId: payload?.messages?.[0]?.id || null,
    normalizedNumber
  };
};

module.exports = {
  normalizeWhatsappNumber,
  buildFileShareWhatsAppMessage,
  sendFileShareWhatsAppMessage
};
