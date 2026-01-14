export function generateCouponCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';

  for (let i = 0; i < 8; i++) {
    if (i === 4) {
      code += '-';
    }
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
}

export function getExpiryDate(daysFromNow: number = 30): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
}
