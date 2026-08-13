import { translations } from "./translations";
import { formatCurrency } from "./formatters";

export const generateWhatsAppReminder = ({
  customerName,
  phone,
  amount,
  status,
  businessName,
  lang = "en"
}) => {
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const formattedAmt = formatCurrency(amount);
  
  let t = translations[lang] || translations.en;
  let message = "";

  if (status === "get") {
    message = t.reminderMsg
      ? t.reminderMsg
          .replace("{name}", customerName)
          .replace("{amount}", formattedAmt)
          .replace("{shop}", businessName)
      : `Dear ${customerName}, your pending balance is ${formattedAmt} at ${businessName}. Kindly pay at your earliest convenience. Thank you!`;
  } else if (status === "give") {
    message = `Dear ${customerName}, we have received payment balance of ${formattedAmt} in your account at ${businessName}. Thank you!`;
  } else {
    message = `Dear ${customerName}, your account balance with ${businessName} is fully settled (${formattedAmt}). Thank you for your business!`;
  }

  const encodedMsg = encodeURIComponent(message);
  const waUrl = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMsg}`
    : `https://api.whatsapp.com/send?text=${encodedMsg}`;

  return { message, waUrl };
};
