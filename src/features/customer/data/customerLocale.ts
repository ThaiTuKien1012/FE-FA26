const unitLabels: Record<string, string> = {
  head: 'cái', kg: 'kg', pack: 'gói', loaf: 'ổ', bottle: 'chai', box: 'hộp',
  jar: 'hũ', tub: 'hộp', cup: 'hộp', bar: 'thanh', punnet: 'hộp', bag: 'bao',
};

export const unitLabel = (unit: string) => unitLabels[unit] || unit;
