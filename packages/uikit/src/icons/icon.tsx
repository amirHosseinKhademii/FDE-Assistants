/**
 * The shared icon frame. Every icon in this package is drawn through it.
 *
 * WHY A SHARED BASE RATHER THAN ONE SVG PER FILE WITH ITS OWN ATTRIBUTES. A
 * mixed icon set is what makes a form row look unfinished: shapes drawn on
 * different grids with different stroke weights cannot be optically aligned no
 * matter what you do to the padding. One `viewBox`, one stroke width, one cap
 * style — so a single inset centres every one of them.
 */
export type IconProps = { className?: string };

export function iconProps(className = '') {
  return {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className: `h-[1.125rem] w-[1.125rem] ${className}`,
    'aria-hidden': true,
  };
}
