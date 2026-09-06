const ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
]

const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']

/** Spell out 0–999; anything larger falls back to digits. The lede sets its
 * counts in words, the ledger sets them as figures. */
export function numberToWords(value: number): string {
  if (!Number.isFinite(value) || value < 0 || value > 999 || !Number.isInteger(value)) {
    return String(value)
  }
  if (value < 20) return ONES[value] ?? String(value)
  if (value < 100) {
    const tens = TENS[Math.floor(value / 10)] ?? ''
    const ones = value % 10
    return ones ? `${tens}-${ONES[ones]}` : tens
  }
  const hundreds = `${ONES[Math.floor(value / 100)] ?? ''} hundred`
  const remainder = value % 100
  return remainder ? `${hundreds} ${numberToWords(remainder)}` : hundreds
}

/** Sentence-case the spelled-out form, for the head of a lede. */
export function numberToWordsCapitalized(value: number): string {
  const words = numberToWords(value)
  return words.charAt(0).toUpperCase() + words.slice(1)
}

const ROMAN: [number, string][] = [
  [1000, 'M'],
  [900, 'CM'],
  [500, 'D'],
  [400, 'CD'],
  [100, 'C'],
  [90, 'XC'],
  [50, 'L'],
  [40, 'XL'],
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
]

export function toRoman(value: number): string {
  let remaining = Math.trunc(value)
  let out = ''
  for (const [amount, numeral] of ROMAN) {
    while (remaining >= amount) {
      out += numeral
      remaining -= amount
    }
  }
  return out
}
