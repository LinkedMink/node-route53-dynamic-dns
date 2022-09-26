const DNS_RECORD_REG_EX = /^[a-z0-9*@][a-z0-9-_.]*\.$/;

export const validateNormalizeDnsRecord = (dnsRecordName: string) => {
  const trimLower = dnsRecordName.trim().toLowerCase();
  const normalized = trimLower.endsWith(".") ? trimLower : `${trimLower}.`;

  if (!DNS_RECORD_REG_EX.test(normalized)) {
    throw new Error(`The name is not a valid DNS record: ${dnsRecordName}`);
  }

  return normalized;
};
