export interface ContactSettings {
  // WhatsApp settings
  whatsappEnabled: boolean;
  whatsappNumber: string;
  whatsappMessage: string;

  // Messenger settings
  messengerEnabled: boolean;
  messengerUsername: string;

  // Telegram settings
  telegramEnabled: boolean;
  telegramUsername: string;

  // General Direct Contact details
  email: string;
  phone: string;
  officeHours: string;
  address: string;
  emergencyDesk: string;
}

export const DEFAULT_CONTACT_SETTINGS: ContactSettings = {
  whatsappEnabled: false,
  whatsappNumber: "",
  whatsappMessage: "",
  messengerEnabled: false,
  messengerUsername: "",
  telegramEnabled: false,
  telegramUsername: "",
  email: "",
  phone: "",
  officeHours: "",
  address: "",
  emergencyDesk: "",
};

export function activeContactChannels(settings: ContactSettings) {
  const whatsapp = settings.whatsappEnabled && Boolean(settings.whatsappNumber.trim());
  const messenger = settings.messengerEnabled && Boolean(settings.messengerUsername.trim());
  const telegram = settings.telegramEnabled && Boolean(settings.telegramUsername.trim());
  const email = Boolean(settings.email.trim());
  const phone = Boolean(settings.phone.trim());
  const officeHours = Boolean(settings.officeHours.trim());
  const address = Boolean(settings.address.trim());
  const emergencyDesk = Boolean(settings.emergencyDesk.trim());
  return {
    whatsapp,
    messenger,
    telegram,
    hasMessaging: whatsapp || messenger || telegram,
    email,
    phone,
    officeHours,
    address,
    emergencyDesk,
    hasDirectDetails: email || phone || officeHours || address || emergencyDesk,
  };
}

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
