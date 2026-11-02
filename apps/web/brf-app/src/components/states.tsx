/**
 * The screen before anything is asked, and the screen when a question fails. A failure
 * says which kind it was, because the reactions differ.
 */
import { Failure as UiFailure } from '@fde/uikit';

export function EmptyState() {
  return (
    <div className="card-aura max-w-2xl p-5 sm:p-6">
      <p className="text-lg leading-relaxed text-ui-fg">
        Ställ en fråga om föreningens stadgar, ordningsregler, protokoll, underhållsplan eller
        årsredovisning. Du får svaret, dokumentet och paragrafen det bygger på.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-ui-dim">
        Sex dokument finns i arkivet. Assistenten läser bara dem. Det den inte hittar säger den i
        stället för att fylla luckan från minnet.
      </p>
    </div>
  );
}

export function Failure({ message, stoppedBecause }: { message: string; stoppedBecause?: string }) {
  const advice =
    stoppedBecause === 'max_turns'
      ? 'Assistenten fick slut på steg innan den hann svara. Det är en gräns i systemet, inte ett fel svar. En smalare fråga brukar räcka.'
      : undefined;
  return <UiFailure title="Inget svar" message={message} advice={advice} />;
}
