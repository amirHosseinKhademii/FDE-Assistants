import { AdvancedMarker, AdvancedMarkerAnchorPoint } from "@vis.gl/react-google-maps";
import { HOME_PATHS, MODE_PATHS, type Mode } from "../lib/transport";

/** Every pin is React content in a real DOM element, so it reads the theme's CSS tokens directly. */
const CENTRE = AdvancedMarkerAnchorPoint.CENTER;

/** The home pin: 44 px accent circle, house centred, pulse ring (off under reduced motion). */
export function HomePin({ position, title }: { position: google.maps.LatLngLiteral; title: string }) {
  return (
    <AdvancedMarker position={position} anchorPoint={CENTRE} title={title} zIndex={1000} collisionBehavior="REQUIRED">
      <div className="pin pin--home">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
          {HOME_PATHS.map((d) => (
            <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </svg>
      </div>
    </AdvancedMarker>
  );
}

/**
 * A stop: a 32 px circle in the mode colour with the pictogram centred. A stop
 * served by a second mode gets a 14 px badge in that mode's colour. Selected
 * stops grow slightly, take the text colour as their ring and show a name chip.
 */
export function StopPin({
  position,
  title,
  mode,
  secondary,
  selected = false,
  label,
  zIndex,
  onClick,
}: {
  position: google.maps.LatLngLiteral;
  title: string;
  mode: Mode;
  secondary?: Mode;
  selected?: boolean;
  label?: string;
  zIndex: number;
  onClick: () => void;
}) {
  return (
    <AdvancedMarker
      position={position}
      anchorPoint={CENTRE}
      title={title}
      zIndex={zIndex}
      collisionBehavior="OPTIONAL_AND_HIDES_LOWER_PRIORITY"
      onClick={onClick}
    >
      <div className={`pin pin--${mode}${selected ? " is-selected" : ""}`}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
          {MODE_PATHS[mode].map((d) => (
            <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </svg>
        {secondary && <span className={`pin-badge mode-${secondary}`} aria-hidden="true" />}
        {selected && label && <span className="pin-label">{label}</span>}
      </div>
    </AdvancedMarker>
  );
}

/** Zoomed out: a 12 px dot in the mode colour, no pictogram. */
export function StopDot({
  position,
  title,
  mode,
  zIndex,
  onClick,
}: {
  position: google.maps.LatLngLiteral;
  title: string;
  mode: Mode;
  zIndex: number;
  onClick: () => void;
}) {
  return (
    <AdvancedMarker position={position} anchorPoint={CENTRE} title={title} zIndex={zIndex} onClick={onClick}>
      <div className={`pin pin--dot pin--${mode}`} />
    </AdvancedMarker>
  );
}
