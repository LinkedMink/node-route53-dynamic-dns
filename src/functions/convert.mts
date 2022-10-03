export const getEnumKeys = (enumeration: Record<string, string | number>) =>
  Object.keys(enumeration).filter(k => isNaN(Number(k)));
