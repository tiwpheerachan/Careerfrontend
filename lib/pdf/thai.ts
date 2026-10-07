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

const WORDS = new Intl.Segmenter('th', { granularity: 'word' });
const GRAPHEMES = new Intl.Segmenter('th', { granularity: 'grapheme' });

/**
 * Text broken into lines that fit `maxWidth`, joined with "\n".
 *
 * Why by hand: @react-pdf/renderer only breaks lines at spaces, and Thai has
 * none between words — a Thai sentence ran off the page. It can be taught
 * break points (the hyphenation callback), but it then draws a "-" at every
 * break, which Thai never has. So the words are found here (Intl.Segmenter
 * knows Thai and Chinese), measured with the same fonts, and the lines are
 * ended explicitly; react-pdf honours "\n". A single word wider than the line
 * is broken between characters.
 */
export function wrapToWidth(text: string, maxWidth: number, widthOf: (s: string) => number): string {
  return text
    .split('\n')
    .map((paragraph) => {
      const lines: string[] = [];
      let line = '';
      const push = (piece: string) => {
        if (widthOf(line + piece) <= maxWidth || line === '') {
          line += piece;
          return;
        }
        lines.push(line.trimEnd());
        line = piece.trimStart();
      };
      for (const { segment } of WORDS.segment(paragraph)) {
        if (widthOf(segment) > maxWidth) {
          for (const { segment: g } of GRAPHEMES.segment(segment)) push(g);
        } else {
          push(segment);
        }
      }
      lines.push(line.trimEnd());
      return lines.join('\n');
    })
    .join('\n');
}
