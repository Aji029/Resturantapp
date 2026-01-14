export const generateQRCodeURL = (restaurantSlug: string): string => {
  const baseURL = window.location.origin;
  const signupURL = `${baseURL}/?restaurant=${restaurantSlug}`;

  const qrAPIURL = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(signupURL)}`;

  return qrAPIURL;
};

export const getRestaurantSignupURL = (restaurantSlug: string): string => {
  const baseURL = window.location.origin;
  return `${baseURL}/?restaurant=${restaurantSlug}`;
};

export const downloadQRCode = async (restaurantSlug: string, restaurantName: string) => {
  const qrURL = generateQRCodeURL(restaurantSlug);

  try {
    const response = await fetch(qrURL);
    const blob = await response.blob();

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${restaurantName.replace(/\s+/g, '-')}-QR-Code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading QR code:', error);
    throw new Error('QR-Code konnte nicht heruntergeladen werden');
  }
};
