const DNS_RECORD_REG_EX = /^((\\052|\\100).)?[a-z0-9-_.]*\.$/;

export const validateNormalizeDnsRecord = (dnsRecordName: string) => {
  const trimLower = dnsRecordName.trim().toLowerCase();
  const withTrailingDot = trimLower.endsWith(".") ? trimLower : `${trimLower}.`;
  const normalized = withTrailingDot.replace("*", "\\052").replace("@", "\\100");

  if (!DNS_RECORD_REG_EX.test(normalized)) {
    throw new Error(`The name is not a valid DNS record: ${dnsRecordName}`);
  }

  return normalized;
};
