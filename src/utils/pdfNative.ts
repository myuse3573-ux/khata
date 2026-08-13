import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Customer, Transaction, User } from '../types';
import { formatCurrency, formatDate } from './formatters';

/**
 * Generates a native PDF statement for a customer and triggers Android native Share sheet
 */
export async function generateAndShareCustomerStatement(
  user: User,
  customer: Customer,
  transactions: Transaction[]
): Promise<void> {
  const customerTxs = transactions.filter(t => t.customerId === customer.id && !t.deletedAt);
  
  let netPaise = 0;
  customerTxs.forEach(t => {
    if (t.type === 'gave') netPaise += t.amount;
    else if (t.type === 'got') netPaise -= t.amount;
  });

  const statusText = netPaise > 0 ? 'YOU WILL GET (Udhar)' : netPaise < 0 ? 'YOU WILL GIVE (Jama)' : 'SETTLED';
  const statusColor = netPaise > 0 ? '#ef4444' : netPaise < 0 ? '#10b981' : '#64748b';

  const txRows = customerTxs.map(t => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 10px; font-size: 13px; color: #334155;">${formatDate(t.date)}</td>
      <td style="padding: 10px; font-size: 13px; color: #334155;">${t.notes || '-'}</td>
      <td style="padding: 10px; font-size: 13px; font-weight: bold; color: ${t.type === 'gave' ? '#ef4444' : '#10b981'}; text-align: right;">
        ${t.type === 'gave' ? 'GAVE ' : 'GOT '}${formatCurrency(t.amount)}
      </td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background-color: #ffffff; }
          .header { text-align: center; border-bottom: 2px solid #059669; padding-bottom: 15px; margin-bottom: 20px; }
          .shop-name { font-size: 24px; font-weight: bold; color: #059669; margin: 0; }
          .sub-title { font-size: 14px; color: #64748b; margin-top: 5px; }
          .info-box { display: flex; justify-content: space-between; background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
          .customer-name { font-size: 18px; font-weight: bold; color: #0f172a; margin: 0; }
          .balance-card { text-align: right; }
          .balance-amt { font-size: 20px; font-weight: bold; color: ${statusColor}; margin: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f1f5f9; padding: 10px; text-align: left; font-size: 12px; color: #475569; text-transform: uppercase; }
          .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="shop-name">${user.shopName || 'Khata Book'}</h1>
          <p class="sub-title">Customer Account Statement — Generated on ${new Date().toLocaleDateString('en-IN')}</p>
        </div>

        <div class="info-box">
          <div>
            <p class="customer-name">${customer.name}</p>
            <p style="margin: 3px 0 0 0; font-size: 13px; color: #64748b;">Phone: ${customer.phone}</p>
          </div>
          <div class="balance-card">
            <p style="margin: 0; font-size: 12px; color: #64748b;">NET BALANCE (${statusText})</p>
            <p class="balance-amt">${formatCurrency(Math.abs(netPaise))}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Details / Notes</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${txRows || '<tr><td colspan="3" style="text-align: center; padding: 20px; color: #94a3b8;">No transactions recorded</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          <p>Thank you for doing business with ${user.shopName}! | Powered by Khata App</p>
        </div>
      </body>
    </html>
  `;

  try {
    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `${customer.name} - Khata Statement`,
        UTI: 'com.adobe.pdf'
      });
    }
  } catch (err) {
    console.error('Failed to generate or share PDF statement:', err);
  }
}
