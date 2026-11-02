/**
 * The screen before anything is asked, and the screen when it goes wrong.
 */
import { Mono } from './typography';

export function EmptyState() {
  return (
    <div className="max-w-xl">
      <p className="text-lg leading-relaxed">
        Ställ en fråga om föreningens stadgar, ordningsregler, protokoll, underhållsplan eller
        årsredovisning. Du får svaret, dokumentet och paragrafen det bygger på.
      </p>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        Sex dokument finns i arkivet. Assistenten läser bara dem. Det den inte hittar där säger den
        i stället för att fylla luckan från minnet.
      </p>
    </div>
  );
}

export function Failure({ message, stoppedBecause }: { message: string; stoppedBecause?: string }) {
  return (
    <div className="max-w-2xl border-l-2 border-claret pl-5">
      <h2 className="mb-2 text-lg font-semibold text-claret">Inget svar</h2>
      <p className="leading-relaxed">{message}</p>
      {stoppedBecause === 'max_turns' ? (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Assistenten fick slut på steg innan den hann svara. Det är en gräns i systemet, inte ett fel
          svar. En smalare fråga brukar räcka.
        </p>
      ) : (
        stoppedBecause && (
          <p className="mt-3 text-sm text-muted">
            stoppades för att <Mono className="text-xs">{stoppedBecause}</Mono>
          </p>
        )
      )}
    </div>
  );
}
