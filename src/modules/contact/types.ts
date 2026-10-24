export interface ContactSettings {
  // WhatsApp settings
  whatsappEnabled: boolean;
  whatsappNumber: string; // e.g. "+960 799 1234"
  whatsappMessage: string; // Default greeting message

  // Messenger settings
  messengerEnabled: boolean;
  messengerUsername: string; // e.g. "maldivesexplorer" or URL

  // Telegram settings
  telegramEnabled: boolean;
  telegramUsername: string; // e.g. "maldivesexplorer" or URL

  // General Direct Contact details
  email: string;
  phone: string;
  officeHours: string;
  address: string;
  emergencyDesk: string;
}

export const DEFAULT_CONTACT_SETTINGS: ContactSettings = {
  whatsappEnabled: true,
  whatsappNumber: "+960 799 1234",
  whatsappMessage: "Hello Maldives Explorer, I would like to inquire about planning a bespoke Maldives trip.",
  messengerEnabled: true,
  messengerUsername: "maldivesexplorer",
  telegramEnabled: true,
  telegramUsername: "maldivesexplorer",
  email: "concierge@xplorer.itnvend.com",
  phone: "+960 332 4500",
  officeHours: "24/7 Island Concierge & Transfer Coordination Desk",
  address: "Waterfront Executive Building, Boduthakurufaanu Magu, Malé 20026, Maldives",
  emergencyDesk: "Velana International Airport (VIA) · Seaplane Terminal Private Desk 4B",
};

export function cleanPhoneForUrl(phone: string): string {
  return phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
}

export function formatWhatsAppUrl(number: string, message?: string): string {
  const clean = cleanPhoneForUrl(number);
  const base = `https://wa.me/${clean}`;
  if (message?.trim()) {
    return `${base}?text=${encodeURIComponent(message.trim())}`;
  }
  return base;
}

export function formatMessengerUrl(username: string): string {
  const clean = username
    .trim()
    .replace(/^https?:\/\/(www\.)?m\.me\//, "")
    .replace(/^@/, "");
  return `https://m.me/${clean}`;
}

export function formatTelegramUrl(username: string): string {
  const clean = username
    .trim()
    .replace(/^https?:\/\/(www\.)?t\.me\//, "")
    .replace(/^@/, "");
  return `https://t.me/${clean}`;
}
