/**
 * The plain-Swedish half of the working notes.
 *
 * Someone who has never heard the phrase "tool call" reads these. Each step gets
 * a sentence saying what just happened and, where it matters, why the search is
 * done this way.
 */
export function explainCall(name: string, args: any): string {
  if (name === 'search_documents') {
    const file: string | undefined = typeof args?.file === 'string' && args.file ? args.file : undefined;
    if (file) {
      return `Söker bara i ${file}. Då blandas inte träffarna med andra regelverk.`;
    }
    return 'Söker i alla dokument samtidigt. Träffar från olika dokument kan hamna i samma svar, och då måste de jämföras.';
  }
  return 'Använder ett verktyg.';
}

export function explainResult(name: string, data: any): string {
  if (!data.ok) {
    return 'Sökningen misslyckades. Felet skickas tillbaka till modellen som text, så att den kan försöka igen eller säga att den inte kunde söka.';
  }
  if (name === 'search_documents') {
    return 'Stycken rankade efter betydelse och ord. En hög rankning betyder inte att svaret finns där. Modellen måste läsa styckena och avgöra själv.';
  }
  return 'Resultat hämtat.';
}

export const RETRY_EXPLANATION =
  'Svaret hade inte rätt form, så felet skickas tillbaka till modellen som försöker igen. Det rättas aldrig tyst.';

export function describeArgs(args: any): string {
  if (!args || typeof args !== 'object') return String(args ?? '');
  if (args.query) return args.file ? `“${args.query}” i ${args.file}` : `“${args.query}”`;
  return JSON.stringify(args);
}
