import { translations } from './translations';
import { formatCurrency } from './formatters';

interface WhatsAppReminderOptions {
  customerName: string;
  phone: string;
  amount: number;
  status: 'get' | 'give' | 'settled';
  businessName: string;
  lang?: 'en' | 'hi';
}

interface WhatsAppReminder {
  message: string;
  waUrl: string;
}

export const generateWhatsAppReminder = ({
  customerName,
  phone,
  amount,
  status,
  businessName,
  lang = 'en'
}: WhatsAppReminderOptions): WhatsAppReminder => {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const formattedAmount = formatCurrency(amount);
  const translation = translations[lang] || translations.en;
  let message: string;

  if (status === 'get') {
    message = translation.reminderMsg
      ? translation.reminderMsg
          .replace('{name}', customerName)
          .replace('{amount}', formattedAmount)
          .replace('{shop}', businessName)
      : `Dear ${customerName}, your pending balance is ${formattedAmount} at ${businessName}. Kindly pay at your earliest convenience. Thank you!`;
  } else if (status === 'give') {
    message = `Dear ${customerName}, we have received payment balance of ${formattedAmount} in your account at ${businessName}. Thank you!`;
  } else {
    message = `Dear ${customerName}, your account balance with ${businessName} is fully settled (${formattedAmount}). Thank you for your business!`;
  }

  const encodedMessage = encodeURIComponent(message);
  const waUrl = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`
    : `https://api.whatsapp.com/send?text=${encodedMessage}`;

  return { message, waUrl };
};
