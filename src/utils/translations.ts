/**
 * Multi-Language Dictionary (English & Hindi) for Khata App
 */

export interface Dictionary {
  appName: string;
  customers: string;
  cashbook: string;
  kitchenRoster: string;
  qrPay: string;
  reports: string;
  settings: string;
  addCustomer: string;
  addTx: string;
  youGave: string;
  youGot: string;
  netBalance: string;
  youWillGet: string;
  youWillGive: string;
  noCustomers: string;
  searchCustomers: string;
  phone: string;
  address: string;
  notes: string;
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  amount: string;
  cashIn: string;
  cashOut: string;
  sendReminder: string;
  reminderMsg: string;
  myQR: string;
  scanQR: string;
  createKitchen: string;
  joinKitchen: string;
  members: string;
  todayDuty: string;
  markDone: string;
  splitExpense: string;
  syncStatus: string;
  offlineMode: string;
  logout: string;
}

export const translations: Record<'en' | 'hi', Dictionary> = {
  en: {
    appName: "Digital Khata Book",
    customers: "Customers",
    cashbook: "Cashbook",
    kitchenRoster: "Kitchen Roster",
    qrPay: "QR Pay",
    reports: "Reports",
    settings: "Settings",
    addCustomer: "Add Customer",
    addTx: "Add Transaction",
    youGave: "You Gave (Gave)",
    youGot: "You Got (Received)",
    netBalance: "Net Balance",
    youWillGet: "You Will Get",
    youWillGive: "You Will Give",
    noCustomers: "No customer records found.",
    searchCustomers: "Search by name or phone...",
    phone: "Phone Number",
    address: "Address",
    notes: "Notes",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    amount: "Amount (₹)",
    cashIn: "Cash In (+)",
    cashOut: "Cash Out (-)",
    sendReminder: "WhatsApp Reminder",
    reminderMsg: "Dear {name}, your pending balance is {amount} at {shop}. Kindly pay at your earliest convenience. Thank you!",
    myQR: "My Payment QR",
    scanQR: "Scan QR Code",
    createKitchen: "Create Kitchen Group",
    joinKitchen: "Join Kitchen Group",
    members: "Group Members",
    todayDuty: "Today's Duty",
    markDone: "Mark Completed",
    splitExpense: "Split Expense",
    syncStatus: "Synced with Cloud",
    offlineMode: "Offline Mode (Local Storage)",
    logout: "Logout"
  },
  hi: {
    appName: "डिजिटल खाता बुक",
    customers: "ग्राहक (Khata)",
    cashbook: "कैशबुक",
    kitchenRoster: "किचन रोस्टर",
    qrPay: "क्यूआर पेमेंट",
    reports: "रिपोर्ट्स",
    settings: "सेटिंग्स",
    addCustomer: "नया ग्राहक जोड़ें",
    addTx: "लेन-देन जोड़ें",
    youGave: "आपने दिया (Udhar)",
    youGot: "आपको मिला (Jama)",
    netBalance: "कुल बाकी राशि",
    youWillGet: "आपको लेना है",
    youWillGive: "आपको देना है",
    noCustomers: "कोई ग्राहक नहीं मिला।",
    searchCustomers: "नाम या फोन नंबर से खोजें...",
    phone: "फोन नंबर",
    address: "पता",
    notes: "टिप्पणी / विवरण",
    save: "सुरक्षित करें",
    cancel: "रद्द करें",
    delete: "हटाएं",
    edit: "संशोधन करें",
    amount: "राशि (₹)",
    cashIn: "कैश आया (+)",
    cashOut: "कैश गया (-)",
    sendReminder: "व्हाट्सएप रिमाइंडर",
    reminderMsg: "प्रिय {name}, आपकी लंबित राशि {amount} {shop} पर बकाया है। कृपया जल्द भुगतान करें। धन्यवाद!",
    myQR: "मेरा यूपीआई QR",
    scanQR: "स्कैन करें QR",
    createKitchen: "नया किचन ग्रुप बनाएं",
    joinKitchen: "किचन ग्रुप में जुड़ें",
    members: "ग्रुप सदस्य",
    todayDuty: "आज की ड्यूटी",
    markDone: "पूर्ण चिन्हित करें",
    splitExpense: "खर्च विभाजित करें",
    syncStatus: "क्लाउड से सिंक है",
    offlineMode: "ऑफलाइन मोड (लोकल)",
    logout: "लॉगआउट"
  }
};
