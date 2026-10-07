/**
 * SARA AM (ำ) written as its two parts: NIKHAHIT (ํ) then SARA AA (า), with a
 * tone mark between them ("น้ำ" → น ํ ้ า), which is how the font draws it.
 *
 * Not cosmetic. The font turns ำ into two glyphs, and @react-pdf/renderer then
 * loses track of where the string ends by one character per ำ: "จำกัด" came
 * out as "จำกั", "น้ำใจ" as "น้ำใ". Splitting it first keeps characters and
 * glyphs one to one, and looks the same. Every Thai string drawn by react-pdf
 * goes through this.
 */
export function splitSaraAm(text: string): string {
  return text.replace(/([่-๋]?)ำ/g, 'ํ$1า');
}
