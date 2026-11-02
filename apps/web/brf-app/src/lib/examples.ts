/**
 * Example questions for the page. Taken from docs/brf/evals/cases.jsonl, so each
 * one has a known right behaviour: five are answered from the documents, the
 * last is one the documents do not cover, and the assistant must say so.
 */
export const EXAMPLE_QUESTIONS: { text: string; hint: string }[] = [
  { text: 'Vilka rör i huset ansvarar föreningen för?', hint: 'Svar från stadgarna' },
  { text: 'Sedan när är det tillåtet att grilla med el på balkongen?', hint: 'En gammal regel har ersatts' },
  { text: 'Kan styrelsen säga nej till att jag hyr ut lägenheten när jag pluggar i Lund?', hint: 'Dokumenten strider mot varandra' },
  { text: 'När är nästa stora fasadarbete planerat?', hint: 'Svar från underhållsplanen' },
  { text: 'Vi planerar att sätta upp en bastu på balkongen. Är det tillåtet enligt reglerna?', hint: 'Finns inte i dokumenten' },
];
