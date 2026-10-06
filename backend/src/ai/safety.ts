export type SafetyFlag = { type: 'money_request' | 'suspicious_link' | 'harassment'; label: string } | null;

const MONEY = /(send (me )?money|need (urgent )?cash|bank transfer|wire (me|the) money|upi\s*id|gpay|paytm|western union|investment opportunity|double your money|crypto (investment|wallet)|processing fee|customs fee)/i;
const LINK = /https?:\/\/(?!kulbandhan\.)[^\s]+/i;
const HARASS = /(kill you|hurt you|come to your house|i know where you live|you will regret)/i;

/** Deterministic pattern matching only — flags for the recipient's awareness, never an accusation sent to the other person or stored as a finding against them. */
export function classifyMessage(text: string): SafetyFlag {
  if (MONEY.test(text)) return { type: 'money_request', label: 'This message asks for money or payment details. Never send money to someone you have only met online.' };
  if (HARASS.test(text)) return { type: 'harassment', label: 'This message contains threatening language. Consider blocking and reporting.' };
  if (LINK.test(text)) return { type: 'suspicious_link', label: 'This message contains a link from outside KULBANDHAN. Be cautious before opening it.' };
  return null;
}
