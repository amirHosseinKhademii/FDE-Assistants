/**
 * THE CODE BASE, AS FILES. Not a database, on purpose.
 *
 * OWN RANDOM STREAM (`SEEDS.corpus`).
 *
 * ── WHY THIS IS NOT A FIFTH DATABASE ──────────────────────────────────────
 *
 * The first draft of this estate had `vst_scm` with tidy `components`,
 * `functions`, `function_params` and `commits` tables. It was wrong, and wrong
 * in the way that matters most: it pre-solved the hardest part of the job.
 *
 * Nobody's software estate arrives normalised. It arrives as a repository —
 * C files with the calibration block in a comment, a CHANGELOG that somebody
 * stopped updating two years ago, a `git log` dump, release notes in prose, a
 * Jira export with embedded commas in the summary field. The fact that
 * `SWC-DAMP` is developed to ASIL B is not a column you compare; it is a
 * sentence in the third paragraph of a safety assessment, and finding it is
 * reading comprehension.
 *
 * That is the same problem the insurance corpus poses, and it gets the same
 * treatment: generate documents deterministically, commit them, chunk them,
 * search them. `docs/steering/corpus/` is to this domain what
 * `docs/examples/policies/` is to insurance.
 *
 * ── DELIBERATE MESS, AND THE LIST OF IT ───────────────────────────────────
 *
 * Every one of these is a real thing that happens in real repositories, and
 * each one breaks a naive parser in a different way:
 *
 *   · the CHANGELOG stops in 2023 while `git log` runs to 2026 — the two
 *     disagree, and the stale one is the more readable
 *   · the calibration block lives in a C comment, not in a data file
 *   · `damping_params.csv` has a trailing comment column, inconsistent
 *     capitalisation and one row with a missing field
 *   · the Jira export quotes some summaries and not others, and one summary
 *     contains a comma
 *   · the ASIL is stated in prose in one file and contradicted by an older
 *     design note in another — the older one is wrong and does not say so
 *   · two files use `Damping_Apply`, one older one calls it `DampApply`
 *
 * NONE OF THIS IS NOISE FOR ITS OWN SAKE. Each item is something a chunker,
 * a citation or a reuse answer has to survive, and a corpus that is uniformly
 * clean proves nothing about any of them.
 */
import { makeHelpers, SEEDS, on } from './rng';
import { ANCHORS } from './anchors';
import { SWC_DAMP_ASIL_TODAY, K2_DAMPING_ASIL_REQUIRED } from '../../config/assumptions';
import type { Programs, ChangeRequests } from '../schema/rows';

export interface CorpusFile {
  /** Repo-relative path, e.g. `eps-steering-feel/src/damping.c`. */
  path: string;
  content: string;
}

const AUTHORS = [
  'd.ferreira', 'm.lindqvist', 'a.kovac', 's.beker', 'j.moreau', 'n.haas',
  'p.strand', 'l.renaud', 'e.palmer', 'r.dietrich', 't.sala', 'i.arnaud',
];

const REPOS: readonly { dir: string; title: string; platform: string; lang: string; team: string; since: number }[] = [
  { dir: 'eps-core', title: 'EPS core control', platform: 'Classic AUTOSAR', lang: 'C', team: 'control', since: 2014 },
  { dir: 'eps-steering-feel', title: 'Steering feel', platform: 'Classic AUTOSAR', lang: 'C', team: 'steering feel', since: 2017 },
  { dir: 'eps-safety-monitor', title: 'Safety monitor', platform: 'Classic AUTOSAR', lang: 'C', team: 'functional safety', since: 2016 },
  { dir: 'eps-motor-control', title: 'Motor current control', platform: 'bare metal', lang: 'C', team: 'motor control', since: 2013 },
  { dir: 'eps-diagnostics', title: 'Diagnostics', platform: 'Classic AUTOSAR', lang: 'C', team: 'diagnostics', since: 2015 },
  { dir: 'eps-end-of-line', title: 'End-of-line calibration', platform: 'Classic AUTOSAR', lang: 'C', team: 'diagnostics', since: 2015 },
  { dir: 'eps-calibration-tools', title: 'Calibration tooling', platform: 'Adaptive AUTOSAR', lang: 'C++', team: 'calibration', since: 2019 },
  { dir: 'eps-steer-by-wire', title: 'Steer-by-wire (pre-development)', platform: 'Adaptive AUTOSAR', lang: 'C++', team: 'control', since: 2024 },
];

export function buildCorpus(
  crm: { programs: Programs[] },
  alm: { change_requests: ChangeRequests[] },
): CorpusFile[] {
  const h = makeHelpers(SEEDS.corpus);
  const files: CorpusFile[] = [];
  const add = (path: string, content: string) => files.push({ path, content: `${content.trimEnd()}\n` });

  const implemented = alm.change_requests.filter((c) => c.status === 'implemented');
  const running = crm.programs.filter((p) => p.status !== 'bid');

  // ════════════════════════════════════════════════════════════════════════
  // eps-steering-feel — the repository the worked example runs through.
  // Written by hand, because every fact in the acceptance test has to be
  // findable here and findable in the form a real repo would hold it.
  // ════════════════════════════════════════════════════════════════════════

  add('eps-steering-feel/README.md', `
# eps-steering-feel

Steering feel software components. Owned by the **steering feel** team
(${h.pick(AUTHORS)}, ${h.pick(AUTHORS)}).

Components in this repository:

| SWC | what it does | element |
|-----|--------------|---------|
| \`${ANCHORS.swcDamping}\` | damping of rack velocity, on-centre feel | ECU |
| \`${ANCHORS.swcHysteresis}\` | hysteresis loop shaping | ECU |
| \`${ANCHORS.swcFriction}\` | friction compensation | ECU |
| \`SWC-RTC\` | return to centre | ECU |

Build: \`make PLATFORM=classic TARGET=tc3xx\`. See \`docs/\` for the design notes
and \`cal/\` for the per-programme calibration datasets.

> Note: the ASIL classification of the components in this repo is **not** uniform.
> Check \`docs/safety-assessment-2021.md\` before assuming anything — in particular
> before reusing a component on a programme with a higher safety goal.
`);

  // ── T3's source of truth, IN PROSE ──────────────────────────────────────
  //
  // This is the file that decides the largest cost item in the worked example,
  // and it is a paragraph, not a column. An answer that wants the ASIL has to
  // read for it.
  add('eps-steering-feel/docs/safety-assessment-2021.md', `
# Safety assessment — steering feel components
**Document:** VST-SA-2021-014 · **Revision:** 3 · **Date:** ${on(2021, 10, 8)}
**Author:** ${h.pick(AUTHORS)} (functional safety) · **Status:** released

## 1. Scope

This assessment covers the four steering feel components as integrated on the
H1 platform (R-EPS, 7600 N class). It does not cover the arbitration or safety
monitor components, which are assessed separately in VST-SA-2020-009.

## 2. Hazard analysis summary

The relevant vehicle-level hazard is unintended lateral motion arising from
assist torque applied without a corresponding driver request. On the H1
platform this was assigned **ASIL D** at vehicle level, discharged through the
safety monitor (\`SWC-SAFEMON\`), which bounds commanded torque independently of
the control path.

## 3. Component classification

Because the safety monitor provides an independent bound on commanded torque,
the steering feel components were decomposed below the vehicle-level goal. The
classification agreed with the assessor was as follows.

\`${ANCHORS.swcDamping}\` and \`${ANCHORS.swcHysteresis}\` are **developed to
ASIL ${SWC_DAMP_ASIL_TODAY}**. \`${ANCHORS.swcFriction}\` and \`SWC-RTC\` are
likewise ASIL ${SWC_DAMP_ASIL_TODAY}. The decomposition argument rests entirely
on the independence of \`SWC-SAFEMON\` and on the torque bound being tighter than
the hazard threshold at all vehicle speeds.

## 4. Limitations — read this before reuse

The decomposition above is **platform specific**. It is valid for H1 and for
programmes that carry the same safety monitor with the same torque bound.

A programme that allocates a higher ASIL directly to the damping path — for
example one that treats damping as part of the assist command rather than as a
separate shaping term — cannot inherit this classification. In that case the
component requires re-development to the allocated ASIL, and the work is
substantially the safety case rather than the code: the C is likely to survive
almost unchanged, while the requirements, the verification evidence, the tool
qualification and the argument itself all have to be produced again.

We have not attempted to estimate that effort here. See the PMO records for
comparable re-classifications.
`);

  // An OLDER design note that contradicts the above and does not say so. A real
  // repository always has one of these, and it is always the tidier document.
  add('eps-steering-feel/docs/design-note-damping.md', `
# Damping — design note
**Document:** VST-DN-2018-031 · **Revision:** 1 · **Date:** ${on(2018, 6, 19)}
**Status:** superseded by VST-SA-2021-014 for classification matters

## Purpose

Damping suppresses rack oscillation after a steering input and contributes to
on-centre feel. Without it the system is lively on centre and the driver
reports a "nervous" wheel at motorway speed.

## Classification

Damping is part of the assist torque path and is therefore developed to
**ASIL D**, in line with the assist component.

> This paragraph is out of date. The 2021 assessment decomposed the steering
> feel components below the vehicle goal on the strength of the independent
> safety monitor. The current classification is in VST-SA-2021-014 §3.
> The note is kept because the rationale in §3 below is still the design
> rationale and is not repeated anywhere else.

## 3. Approach

Damping torque is computed from estimated rack velocity and scaled by a
speed-dependent gain. The gain is broken at \`DAMP_SPD_BRK\` so that low-speed
parking manoeuvres are not damped into treacle, and the output is rate-limited
to avoid a step at the break point.
`);

  // ── the C file, with the "args" in a comment block ──────────────────────
  add('eps-steering-feel/src/damping.c', `
/*
 * damping.c — ${ANCHORS.swcDamping} / ${ANCHORS.fnDamping}
 *
 * Copyright (c) 2018-2026 Vantis Steering Systems. All rights reserved.
 *
 * Runnable: Damping_Runnable_1ms   (period 1 ms, task TASK_CTRL_1MS)
 * ASIL:     see docs/safety-assessment-2021.md — do NOT assume from this header
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name             type      unit        min     max     default  cal?
 * DAMP_GAIN_BASE   float32   Nm*s/rad    0.00    0.90    0.20     yes
 * DAMP_SPD_BRK     float32   km/h        0       180     60       yes
 * DAMP_MAX_TRQ     float32   Nm          0.00    3.00    1.10     yes
 * DAMP_RATE_LIM    float32   Nm/s        0       40      12       yes
 * DAMP_ENABLE      boolean   -           0       1       1        no   (compile-time)
 *
 * The damping term contributes to the on-centre hysteresis figure. As of
 * VST-DN-2018-031 the contribution at the K2 test point is 0.2 Nm; the
 * hysteresis compensation term contributes considerably more. Both are
 * measured AT THE MOTOR, not at the wheel — see the open item in the K2
 * budget (${ANCHORS.chrHysteresis}).
 */

#include "damping.h"
#include "veh_speed.h"
#include "rack_est.h"

static float32 s_prev_trq = 0.0f;

Std_ReturnType ${'Damping_Apply'}(const DampIn_t *in, DampOut_t *out)
{
    float32 gain, trq, d;

    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    /* Speed-dependent gain, broken at DAMP_SPD_BRK. */
    if (in->veh_speed_kmh <= DAMP_SPD_BRK) {
        gain = DAMP_GAIN_BASE * (in->veh_speed_kmh / DAMP_SPD_BRK);
    } else {
        gain = DAMP_GAIN_BASE;
    }

    trq = gain * in->rack_vel_rad_s;

    /* Rate limit. Added 2020 after the H1 step-at-break-point finding. */
    d = trq - s_prev_trq;
    if (d >  (DAMP_RATE_LIM * DT_1MS)) { trq = s_prev_trq + (DAMP_RATE_LIM * DT_1MS); }
    if (d < -(DAMP_RATE_LIM * DT_1MS)) { trq = s_prev_trq - (DAMP_RATE_LIM * DT_1MS); }

    if (trq >  DAMP_MAX_TRQ) { trq =  DAMP_MAX_TRQ; }
    if (trq < -DAMP_MAX_TRQ) { trq = -DAMP_MAX_TRQ; }

    s_prev_trq  = trq;
    out->damp_trq_nm = trq;
    return E_OK;
}
`);

  // An older file that calls the function by its pre-2018 name. Anything
  // matching on the function name has to cope with both.
  add('eps-steering-feel/src/legacy/damp_compat.c', `
/*
 * damp_compat.c — compatibility shim for pre-2018 integrations.
 *
 * The function was called DampApply() until the 2018 naming cleanup. Two
 * programmes still integrate against the old symbol. Do not delete before
 * ${on(2027, 1, 1)}; see TICKET VST-4471.
 */
#include "damping.h"

Std_ReturnType DampApply(const DampIn_t *in, DampOut_t *out)
{
    return Damping_Apply(in, out);
}
`);

  // ── a calibration file that is not quite a table ─────────────────────────
  add('eps-steering-feel/cal/damping_params.csv', `
# damping calibration datasets, exported from CalTool 4.2
# NOTE: the 'notes' column is free text and MAY contain commas. Quote it.
programme,param,value,unit,dataset,approved,notes
${ANCHORS.carryoverProgram},DAMP_GAIN_BASE,0.240,Nm*s/rad,v4.2,${on(2023, 2, 14)},"baseline for H1, signed off at the Feb ride"
${ANCHORS.carryoverProgram},DAMP_SPD_BRK,55,km/h,v4.2,${on(2023, 2, 14)},
${ANCHORS.carryoverProgram},DAMP_MAX_TRQ,1.05,Nm,v4.2,${on(2023, 2, 14)},
${ANCHORS.carryoverProgram},damp_rate_lim,12,Nm/s,v4.2,${on(2023, 2, 14)},lowercase in the export, same parameter
PRG-ORV-04,DAMP_GAIN_BASE,0.180,Nm*s/rad,v3.9,${on(2022, 6, 2)},"softer, C segment"
PRG-ORV-04,DAMP_SPD_BRK,70,km/h,v3.9,${on(2022, 6, 2)},
PRG-ORV-04,DAMP_MAX_TRQ,,Nm,v3.9,${on(2022, 6, 2)},value missing in the export — see CalTool ticket 881
PRG-TDR-11,DAMP_GAIN_BASE,0.310,Nm*s/rad,v5.0,${on(2024, 9, 30)},"D segment, customer asked for more damping on centre"
PRG-TDR-11,DAMP_SPD_BRK,48,km/h,v5.0,${on(2024, 9, 30)},
`);

  // ── the CHANGELOG that stopped ───────────────────────────────────────────
  add('eps-steering-feel/CHANGELOG.md', `
# Changelog

All notable changes to this repository. Keep a Changelog format, roughly.

> Maintenance of this file stopped in 2023 when the team moved to release notes
> generated from the tracker. It is kept because the entries before that are the
> only readable account of why the early design decisions were made. **For
> anything after 2023-05, use \`git-log.txt\` or \`releases/\`.**

## [4.2.0] - ${on(2023, 5, 11)}
### Changed
- Damping gain break point is now per-programme calibratable (\`DAMP_SPD_BRK\`).

## [4.1.0] - ${on(2022, 11, 3)}
### Fixed
- Rate limiter could overflow on a 1 ms tick at high rack velocity. Found on HIL.

## [4.0.0] - ${on(2021, 10, 20)}
### Changed
- Components re-classified following VST-SA-2021-014. **This changed the ASIL.**

## [3.4.0] - ${on(2020, 4, 8)}
### Added
- Output rate limiting (\`DAMP_RATE_LIM\`) after the H1 step-at-break-point finding.

## [3.0.0] - ${on(2018, 6, 19)}
### Added
- Initial damping component, \`DampApply()\`.
`);

  // ── git log, running past where the CHANGELOG stopped ────────────────────
  {
    const lines: string[] = [];
    const MESSAGES = [
      'fix damping rate limiter overflow on 1 ms tick',
      'retune damping break point for C segment',
      'add plausibility check on rack velocity estimate',
      'refactor gain schedule into a table',
      'raise unit test coverage on damping to 90%',
      'correct sign on the return-to-centre term',
      'guard against divide by zero at standstill',
      'reduce stack usage in the 1 ms runnable',
      'apply review comments from the safety review',
      'update hysteresis compensation map for H1 facelift',
      'bump CalTool export format to 4.2',
      'remove dead code in damp_compat',
    ];
    const FILES = [
      'src/damping.c', 'src/hysteresis_comp.c', 'src/friction_comp.c',
      'src/rtc.c', 'src/legacy/damp_compat.c', 'cal/damping_params.csv',
      'docs/design-note-damping.md', 'test/test_damping.c',
    ];
    for (let i = 0; i < 260; i++) {
      const sha = hex(h, 40, i + 1);
      const author = h.pick(AUTHORS);
      const chr = h.chance(0.4) && implemented.length ? h.pick(implemented).chr_id : null;
      lines.push(`commit ${sha}`);
      lines.push(`Author: ${author} <${author}@vantis-steering.example>`);
      lines.push(`Date:   ${h.dayBetween(-3_000, -6)}`);
      lines.push('');
      lines.push(`    ${h.pick(MESSAGES)}`);
      if (chr) {
        lines.push('');
        lines.push(`    Change-Request: ${chr}`);
      }
      lines.push('');
      for (const f of h.sample(FILES, h.int(1, 3))) {
        lines.push(` ${f} | ${h.int(1, 180)} ${'+'.repeat(h.int(1, 12))}${'-'.repeat(h.int(0, 6))}`);
      }
      lines.push('');
    }
    add('eps-steering-feel/git-log.txt', `# git log --stat, exported ${on(2026, 9, 7)}\n\n${lines.join('\n')}`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // The other repositories — same shapes, less depth.
  // ════════════════════════════════════════════════════════════════════════

  for (const r of REPOS) {
    if (r.dir === 'eps-steering-feel') continue;

    add(`${r.dir}/README.md`, `
# ${r.dir}

${r.title}. ${r.platform}, ${r.lang}. Owned by the **${r.team}** team.
First commit ${on(r.since, h.int(1, 12), h.int(1, 28))}.

Build: \`make PLATFORM=${r.platform.includes('Adaptive') ? 'adaptive' : 'classic'}\`.

Integrated on: ${h.sample(running, h.int(2, 5)).map((p) => p.program_id).join(', ')}.
`);

    add(`${r.dir}/docs/overview.md`, `
# ${r.title} — overview
**Revision:** ${h.int(1, 6)} · **Date:** ${h.dayBetween(-2_500, -200)}

## Scope

${r.title} as integrated on the R-EPS and DP-EPS platforms.

## Classification

The components in this repository are developed to **ASIL ${h.pick(['QM', 'B', 'C', 'D'])}**
per the platform safety concept. Component-level decomposition, where it applies,
is recorded in the relevant assessment document and not here.

## Interfaces

Inputs and outputs are exchanged over the internal RTE. Timing is ${h.pick([1, 2, 5, 10])} ms.
`);

    {
      const lines: string[] = [];
      for (let i = 0; i < h.int(60, 160); i++) {
        const author = h.pick(AUTHORS);
        const chr = h.chance(0.35) && implemented.length ? h.pick(implemented).chr_id : null;
        lines.push(`commit ${hex(h, 40, i + 1)}`);
        lines.push(`Author: ${author} <${author}@vantis-steering.example>`);
        lines.push(`Date:   ${h.dayBetween(-3_200, -10)}`);
        lines.push('');
        lines.push(`    ${h.pick(['fix', 'add', 'refactor', 'update', 'remove'])} ${h.pick(['guard', 'map', 'table', 'check', 'handler', 'filter'])} in ${r.dir.slice(4)}`);
        if (chr) { lines.push(''); lines.push(`    Change-Request: ${chr}`); }
        lines.push('');
      }
      add(`${r.dir}/git-log.txt`, `# git log, exported ${on(2026, 9, 7)}\n\n${lines.join('\n')}`);
    }
  }

  // ── the ticket export, messy in the way exports are ─────────────────────
  {
    const rows: string[] = ['key,type,summary,component,severity,found_in,status,created,resolved,change_request'];
    const SUMMARIES = [
      'Damping step at break point on H1',
      'Assist map discontinuity above 120 km/h',
      'Torque sensor plausibility trips on cold start',
      'EOL learn times out, intermittently, on line 3',
      'Diagnostic DID 0xF190 returns padded string',
      'Return to centre overshoots at 60 km/h',
      'Hysteresis compensation asymmetric left vs right',
      'Motor current ripple above spec at low speed',
    ];
    for (let i = 0; i < 240; i++) {
      const summary = h.pick(SUMMARIES);
      // Some summaries are quoted, some are not. Whether a row needs quoting
      // and whether the export actually quoted it are two different things.
      const needsQuote = summary.includes(',');
      const quoted = needsQuote || h.chance(0.3);
      const chr = h.chance(0.3) && implemented.length ? h.pick(implemented).chr_id : '';
      const created = h.dayBetween(-2_800, -20);
      rows.push([
        `VST-${1000 + i}`,
        h.pick(['Bug', 'Bug', 'Bug', 'Task', 'Story']),
        quoted ? `"${summary}"` : summary,
        h.pick([ANCHORS.swcDamping, ANCHORS.swcHysteresis, ANCHORS.swcAssist, 'SWC-MOTCTL', 'SWC-DIAG', 'SWC-SAFEMON']),
        h.chance(0.12) ? 'blocker' : h.chance(0.45) ? 'major' : 'minor',
        h.chance(0.42) ? 'unit' : h.chance(0.55) ? 'HIL' : h.chance(0.7) ? 'vehicle' : 'field',
        h.chance(0.82) ? 'Closed' : h.pick(['Open', 'In Progress', 'Blocked']),
        created,
        h.chance(0.82) ? h.day(Number(daysBetween(created)) + h.int(3, 180)) : '',
        chr,
      ].join(','));
    }
    add('tickets/jira-export-2026-09.csv', `# exported from Jira ${on(2026, 9, 7)} by ${h.pick(AUTHORS)}\n# encoding: utf-8, delimiter: comma, quoting: minimal (sic)\n${rows.join('\n')}`);
  }

  // ── release notes, in prose ──────────────────────────────────────────────
  for (let i = 0; i < 24; i++) {
    const r = h.pick(REPOS);
    const v = `${h.int(1, 9)}.${h.int(0, 20)}.${h.int(0, 9)}`;
    add(`releases/${r.dir}-${v}.md`, `
# ${r.dir} ${v}
**Released:** ${h.dayBetween(-2_800, -20)} · **Status:** ${h.chance(0.9) ? 'released' : h.chance(0.5) ? 'candidate' : 'withdrawn'}
**Programmes:** ${h.sample(running, h.int(1, 3)).map((p) => p.program_id).join(', ')}

## What changed

${h.pick([
  'Calibration range widened following the customer ride evaluation.',
  'Defect fix for the rate limiter overflow reported on HIL.',
  'Diagnostic service set aligned to the customer specification revision.',
  'No functional change; rebuild against the updated MCAL.',
  'Safety monitor bound tightened after the FMEDA review.',
])}

## Known limitations

${h.pick([
  'The compatibility shim for the pre-2018 symbol name is still present.',
  'Coverage on the 1 ms path is below the 90% target; waiver VST-W-0031 applies.',
  'None.',
  'Calibration for the CN region is not included in this release.',
])}
`);
  }

  return files;
}

/** A plausible sha, fully determined by the stream. See software history above. */
function hex(h: { int(lo: number, hi: number): number }, len: number, salt: number): string {
  const chars = '0123456789abcdef';
  let out = salt.toString(16).padStart(6, '0');
  while (out.length < len) out += chars[h.int(0, 15)];
  return out.slice(0, len);
}

/** Days from EPOCH for an ISO day, so resolution dates follow creation dates. */
function daysBetween(isoDay: string): number {
  return Math.round((Date.parse(`${isoDay}T00:00:00Z`) - Date.UTC(2026, 8, 13)) / 86_400_000);
}
