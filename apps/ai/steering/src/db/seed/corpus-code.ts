/**
 * THE CODE BASE, PROPERLY. Sources, headers, tests, configs, reports.
 *
 * OWN RANDOM STREAM (`SEEDS.corpusCode`).
 *
 * ── WHAT THIS REPLACES ────────────────────────────────────────────────────
 *
 * The first code corpus was one README, one overview and one git log per
 * repository — eight repos, twenty-odd files. It made the point that software
 * lives in files rather than tables, and then stopped, which meant the question
 * "do we already have a function that does X" was answerable by reading three
 * documents. In a real code base it is not.
 *
 * So this generates what a Tier-1 embedded repository actually contains:
 *
 *   src/*.c, src/*.h        the implementation, with the parameter block in a
 *                           comment and the ASIL in a header that may or may
 *                           not agree with the safety assessment
 *   test/test_*.c           unit tests, which are the best surviving statement
 *                           of what a function is supposed to do
 *   cfg/*.json, Makefile    build configuration — where the ASIL actually gets
 *                           compiled in, which is a THIRD source of truth
 *   reports/misra-*.txt     static analysis, with deviations and their owners
 *   reports/hil-*.md        integration test reports
 *   docs/                   interface descriptions, integration manuals
 *   CODEOWNERS, review notes
 *
 * ── THE THREE-PLACE PROBLEM, WHICH IS THE POINT ───────────────────────────
 *
 * A component's safety level is now stated in THREE places: the safety
 * assessment (prose), the C header (a comment), and the build configuration (a
 * compile flag). In a real repository these drift, and here they do too — for
 * one component deliberately. Finding out which one governs is exactly the kind
 * of question this whole tool exists to answer, and no database can hold it.
 */
import { makeHelpers, SEEDS, on } from './rng';
import { ANCHORS } from './anchors';
import { SWC_DAMP_ASIL_TODAY } from '../../config/assumptions';
import type { CorpusFile } from './corpus';
import type { Crm, Alm } from '../schema/rows';

interface RepoSpec {
  dir: string;
  title: string;
  team: string;
  platform: string;
  modules: { file: string; swc: string; asil: string; fns: string[] }[];
}

const REPOS: readonly RepoSpec[] = [
  {
    dir: 'eps-core', title: 'EPS core control', team: 'control', platform: 'classic-autosar',
    modules: [
      { file: 'assist', swc: ANCHORS.swcAssist, asil: 'D', fns: ['Assist_Init', 'Assist_CalcBase', 'Assist_ApplySpeedScale', 'Assist_Limit', 'Assist_MainRunnable'] },
      { file: 'arbitration', swc: 'SWC-ARB', asil: 'D', fns: ['Arb_Init', 'Arb_Select', 'Arb_RateLimit', 'Arb_MainRunnable'] },
      { file: 'torque_sense', swc: 'SWC-TRQSENS', asil: 'D', fns: ['TrqSens_Init', 'TrqSens_Read', 'TrqSens_Plausibilise', 'TrqSens_Filter'] },
      { file: 'veh_speed', swc: 'SWC-ARB', asil: 'B', fns: ['VehSpd_Read', 'VehSpd_CheckStaleness', 'VehSpd_Fallback'] },
    ],
  },
  {
    dir: 'eps-steering-feel', title: 'Steering feel', team: 'steering feel', platform: 'classic-autosar',
    modules: [
      { file: 'damping', swc: ANCHORS.swcDamping, asil: SWC_DAMP_ASIL_TODAY, fns: ['Damping_Init', 'Damping_Apply', 'Damping_RateLimit'] },
      { file: 'hysteresis_comp', swc: ANCHORS.swcHysteresis, asil: 'B', fns: ['Hyst_Init', 'Hyst_Shape', 'Hyst_Apply'] },
      { file: 'friction_comp', swc: ANCHORS.swcFriction, asil: 'B', fns: ['Fric_Init', 'Fric_Estimate', 'Fric_Compensate'] },
      { file: 'rtc', swc: 'SWC-RTC', asil: 'B', fns: ['Rtc_Init', 'Rtc_CalcReturn', 'Rtc_Blend'] },
    ],
  },
  {
    dir: 'eps-safety-monitor', title: 'Safety monitor', team: 'functional safety', platform: 'classic-autosar',
    modules: [
      { file: 'torque_bound', swc: 'SWC-SAFEMON', asil: 'D', fns: ['Bound_Init', 'Bound_Check', 'Bound_Trip'] },
      { file: 'watchdog', swc: 'SWC-SAFEMON', asil: 'D', fns: ['Wdg_Init', 'Wdg_Kick', 'Wdg_Expire'] },
      { file: 'plausibility', swc: 'SWC-SAFEMON', asil: 'D', fns: ['Plaus_Init', 'Plaus_CrossCheck', 'Plaus_Report'] },
    ],
  },
  {
    dir: 'eps-motor-control', title: 'Motor current control', team: 'motor control', platform: 'bare-metal',
    modules: [
      { file: 'foc', swc: 'SWC-MOTCTL', asil: 'D', fns: ['Foc_Init', 'Foc_Park', 'Foc_Clarke', 'Foc_CurrentLoop', 'Foc_Pwm'] },
      { file: 'field_weakening', swc: 'SWC-MOTCTL', asil: 'D', fns: ['Fw_Init', 'Fw_Calc'] },
      { file: 'temp_derate', swc: 'SWC-MOTCTL', asil: 'B', fns: ['Derate_Init', 'Derate_Apply'] },
    ],
  },
  {
    dir: 'eps-diagnostics', title: 'Diagnostics', team: 'diagnostics', platform: 'classic-autosar',
    modules: [
      { file: 'dtc', swc: 'SWC-DIAG', asil: 'QM', fns: ['Dtc_Init', 'Dtc_Set', 'Dtc_Clear', 'Dtc_Report'] },
      { file: 'uds', swc: 'SWC-DIAG', asil: 'QM', fns: ['Uds_Init', 'Uds_Dispatch', 'Uds_ReadDid', 'Uds_WriteDid'] },
      { file: 'snapshot', swc: 'SWC-DIAG', asil: 'QM', fns: ['Snap_Capture', 'Snap_Store'] },
    ],
  },
  {
    dir: 'eps-end-of-line', title: 'End-of-line calibration', team: 'diagnostics', platform: 'classic-autosar',
    modules: [
      { file: 'eol_learn', swc: 'SWC-EOL', asil: 'QM', fns: ['Eol_Init', 'Eol_LearnCentre', 'Eol_LearnOffsets', 'Eol_Store'] },
      { file: 'eol_seq', swc: 'SWC-EOL', asil: 'QM', fns: ['EolSeq_Run', 'EolSeq_Abort'] },
    ],
  },
  {
    dir: 'eps-calibration-tools', title: 'Calibration tooling', team: 'calibration', platform: 'adaptive-autosar',
    modules: [
      { file: 'a2l_export', swc: 'SWC-PLT-001', asil: 'QM', fns: ['A2l_Load', 'A2l_Export', 'A2l_Merge'] },
      { file: 'dataset', swc: 'SWC-PLT-002', asil: 'QM', fns: ['Ds_Open', 'Ds_Diff', 'Ds_Apply'] },
    ],
  },
  {
    dir: 'eps-steer-by-wire', title: 'Steer-by-wire (pre-development)', team: 'control', platform: 'adaptive-autosar',
    modules: [
      { file: 'road_wheel_actuator', swc: 'SWC-PLT-010', asil: 'D', fns: ['Rwa_Init', 'Rwa_Track', 'Rwa_Fault'] },
      { file: 'feedback_actuator', swc: 'SWC-PLT-011', asil: 'D', fns: ['Fba_Init', 'Fba_Render', 'Fba_Fault'] },
    ],
  },
];

/** The bulk of any embedded repository: utilities nobody has opened in years. */
const UTILITY_MODULES = [
  'ring_buffer', 'can_shim', 'unit_conv', 'crc', 'lookup_table', 'filter_iir',
  'rate_limit', 'debounce', 'nvm_block', 'timebase', 'fixpt', 'sat_math',
  'bitfield', 'checksum', 'event_queue', 'state_machine',
];
const UTILITY_FNS = ['Init', 'Put', 'Get', 'Reset', 'Check', 'Calc', 'Update', 'Flush', 'Peek', 'Apply'];

const AUTHORS = ['d.ferreira', 'm.lindqvist', 'a.kovac', 's.beker', 'j.moreau', 'n.haas', 'p.strand', 'l.renaud', 'e.palmer', 'r.dietrich'];

export function buildCodeCorpus(crm: Crm, alm: Alm): CorpusFile[] {
  const h = makeHelpers(SEEDS.corpusCode);
  const files: CorpusFile[] = [];
  const add = (path: string, content: string): void => {
    files.push({ path, content: `${content.replace(/^\n/, '').trimEnd()}\n` });
  };

  const implemented = alm.change_requests.filter((c) => c.status === 'implemented');
  const running = crm.programs.filter((p) => p.status !== 'bid');

  for (const base of REPOS) {
    // ── the rest of the repository ────────────────────────────────────────
    //
    // The named modules above are the ones the worked example touches. A real
    // repository is mostly NOT those: it is the utility, the buffer, the CAN
    // shim, the unit-conversion helper nobody has looked at since 2017.
    //
    // That bulk is not padding. "Do we already have a function that does X" is
    // only a hard question when there are four hundred functions to search, and
    // a corpus where every module is load-bearing answers it by elimination.
    const extras = Array.from({ length: h.int(4, 8) }, (_, i) => {
      const name = h.pick(UTILITY_MODULES);
      return {
        file: `${name}_${i + 1}`,
        swc: `SWC-PLT-${String(h.int(1, 35)).padStart(3, '0')}`,
        asil: h.pick(['QM', 'QM', 'B', 'B', 'C', 'D']),
        fns: h.sample(UTILITY_FNS, h.int(3, 6)).map((f) => `${cap(name)}_${f}`),
      };
    });
    const repo: RepoSpec = { ...base, modules: [...base.modules, ...extras] };

    // ── CODEOWNERS ────────────────────────────────────────────────────────
    add(`${repo.dir}/CODEOWNERS`,
      `# ${repo.title}\n` +
      `*                    @vantis/${repo.team.replace(/\s+/g, '-')}\n` +
      repo.modules.map((m) => `src/${m.file}.c        @vantis/${repo.team.replace(/\s+/g, '-')}`).join('\n') +
      `\nreports/             @vantis/functional-safety\n`);

    // ── the build configuration: a THIRD statement of the ASIL ────────────
    //
    // THE DELIBERATE DRIFT LIVES HERE. For `damping`, the safety assessment
    // says ASIL B, the C header says ASIL B, and this file compiles it at
    // ASIL D — because somebody raised the flag during a pre-development
    // experiment and never put it back. Nothing reconciles the three.
    add(`${repo.dir}/cfg/build.json`, JSON.stringify({
      repo: repo.dir,
      platform: repo.platform,
      toolchain: h.pick(['tasking-6.3r1', 'greenhills-2022.1', 'gcc-arm-11.2']),
      modules: Object.fromEntries(repo.modules.map((m) => [m.file, {
        swc: m.swc,
        asil: m.file === 'damping' ? 'D' : m.asil,
        optimisation: h.pick(['-O2', '-O2', '-Os']),
        stack_bytes: h.int(256, 4096),
      }])),
      note: repo.dir === 'eps-steering-feel'
        ? 'damping is built at ASIL D following the 2024 SbW pre-development trial. See reports/misra-damping.txt deviation D-07.'
        : undefined,
    }, null, 2));

    add(`${repo.dir}/Makefile`, `
# ${repo.title} — ${repo.platform}
# Generated build. Do not edit by hand; edit cfg/build.json.

CC      ?= ${h.pick(['tricore-gcc', 'ccarm', 'arm-none-eabi-gcc'])}
CFLAGS  += -Wall -Wextra -Werror ${h.pick(['-O2', '-Os'])} -std=c99
SRCS    := ${repo.modules.map((m) => `src/${m.file}.c`).join(' ')}
OBJS    := $(SRCS:.c=.o)

all: ${repo.dir}.a

${repo.dir}.a: $(OBJS)
\t$(AR) rcs $@ $^

test:
\t$(MAKE) -C test run

clean:
\trm -f $(OBJS) ${repo.dir}.a

.PHONY: all test clean
`);

    // ── per module: header, source, test ──────────────────────────────────
    for (const m of repo.modules) {
      const params = m.fns.slice(1).map((fn, i) => `${m.file.slice(0, 4).toUpperCase()}_${fn.split('_')[1]?.toUpperCase() ?? 'P'}${i}`);

      add(`${repo.dir}/src/${m.file}.h`, `
/*
 * ${m.file}.h — ${m.swc}
 *
 * ASIL: ${m.asil}   (see the safety assessment for the governing statement —
 *                     this header is a convenience and has been wrong before)
 * Owner: ${repo.team}
 */
#ifndef ${m.file.toUpperCase()}_H
#define ${m.file.toUpperCase()}_H

#include "Std_Types.h"

typedef struct {
${m.fns.slice(0, 3).map((_, i) => `    float32 in${i};`).join('\n')}
} ${cap(m.file)}In_t;

typedef struct {
    float32 out;
    uint8   status;
} ${cap(m.file)}Out_t;

${m.fns.map((fn) => `Std_ReturnType ${fn}(${fn.endsWith('Init') ? 'void' : `const ${cap(m.file)}In_t *in, ${cap(m.file)}Out_t *out`});`).join('\n')}

#endif /* ${m.file.toUpperCase()}_H */
`);

      // The real damping source is written out in full by `corpus.ts` — this
      // generator does not overwrite it. Everything else gets a plausible body.
      if (!(repo.dir === 'eps-steering-feel' && m.file === 'damping')) {
        add(`${repo.dir}/src/${m.file}.c`, `
/*
 * ${m.file}.c — ${m.swc} / ${repo.title}
 *
 * Copyright (c) ${h.int(2013, 2020)}-2026 Vantis Steering Systems.
 *
 * ASIL: ${m.asil}
 * Runnable: ${m.file}_MainRunnable   (period ${h.pick([1, 1, 2, 5, 10, 10, 20])} ms)
 *
 * CALIBRATION PARAMETERS
 * ----------------------
 * name${' '.repeat(18)}type      unit        min      max      default
${params.map((p) => ` * ${p.padEnd(22)}float32   ${h.pick(['Nm', 'A', 'rad/s', 'km/h', '-']).padEnd(10)}  ${String(0).padStart(6)}  ${String(h.int(1, 200)).padStart(7)}  ${String(h.num(0.1, 50, 2)).padStart(8)}`).join('\n')}
 */

#include "${m.file}.h"

${m.fns.map((fn) => `
Std_ReturnType ${fn}(${fn.endsWith('Init') ? 'void' : `const ${cap(m.file)}In_t *in, ${cap(m.file)}Out_t *out`})
{
${fn.endsWith('Init') ? '    /* one-time setup */\n    return E_OK;' : `    if (in == NULL_PTR || out == NULL_PTR) {
        return E_NOT_OK;
    }

    out->out = in->in0 * ${h.num(0.1, 3, 2)}f;
    out->status = 0u;
    return E_OK;`}
}`).join('\n')}
`);
      }

      add(`${repo.dir}/test/test_${m.file}.c`, `
/*
 * test_${m.file}.c — unit tests for ${m.swc}
 *
 * THESE TESTS ARE THE BEST SURVIVING STATEMENT OF WHAT THIS MODULE IS
 * SUPPOSED TO DO. The design note is from ${h.int(2015, 2020)} and the
 * behaviour has moved since; the tests have not been allowed to.
 */
#include "unity.h"
#include "${m.file}.h"

${m.fns.filter((f) => !f.endsWith('Init')).map((fn) => `
void test_${fn}_rejects_null(void)
{
    TEST_ASSERT_EQUAL(E_NOT_OK, ${fn}(NULL_PTR, NULL_PTR));
}

void test_${fn}_${h.pick(['holds_at_zero', 'saturates_at_limit', 'is_monotonic', 'is_symmetric'])}(void)
{
    ${cap(m.file)}In_t  in  = { 0 };
    ${cap(m.file)}Out_t out = { 0 };
    TEST_ASSERT_EQUAL(E_OK, ${fn}(&in, &out));
    TEST_ASSERT_FLOAT_WITHIN(0.001f, 0.0f, out.out);
}`).join('\n')}
`);
    }

    // ── static analysis report ────────────────────────────────────────────
    for (const m of repo.modules) {
      add(`${repo.dir}/reports/misra-${m.file}.txt`, `
MISRA C:2012 compliance report
Repository : ${repo.dir}
Module     : ${m.file}.c   (${m.swc}, ASIL ${m.asil})
Tool       : ${h.pick(['Polyspace 2023b', 'LDRA 9.8', 'Coverity 2022.12'])}
Run        : ${h.dayBetween(-2_000, -30)}
Run by     : ${h.pick(AUTHORS)}

SUMMARY
  rules checked        ${h.int(140, 175)}
  violations           ${h.int(0, 24)}
  deviations approved  ${h.int(0, 6)}
  unresolved           ${h.int(0, 4)}

DEVIATIONS
${repo.dir === 'eps-steering-feel' && m.file === 'damping' ? `
  D-07  Rule 10.4  mixed-type arithmetic in the rate limiter.
        Approved ${on(2024, 3, 11)} by functional safety.
        NOTE: raised while the module was being built at ASIL D for the
        steer-by-wire pre-development trial. The trial ended; the build
        flag in cfg/build.json was never put back. The module is assessed
        at ASIL B in VST-SA-2021-014 and built at ASIL D. Nobody has said
        which one governs.
` : h.sample([
  `  D-${h.int(1, 40)}  Rule ${h.int(8, 21)}.${h.int(1, 9)}  pointer arithmetic in the buffer walk. Approved.`,
  `  D-${h.int(1, 40)}  Rule ${h.int(8, 21)}.${h.int(1, 9)}  goto used for single-exit error handling. Approved.`,
  `  D-${h.int(1, 40)}  Rule ${h.int(8, 21)}.${h.int(1, 9)}  union used for the CAN frame overlay. Approved.`,
  '  (none)',
], h.int(1, 2)).join('\n')}

UNRESOLVED
${h.chance(0.5) ? `  Rule ${h.int(8, 21)}.${h.int(1, 9)} at ${m.file}.c:${h.int(40, 400)} — owner ${h.pick(AUTHORS)}, no target date` : '  (none)'}
`);
    }

    // ── HIL / integration test reports ────────────────────────────────────
    for (let i = 0; i < h.int(4, 10); i++) {
      const prog = h.pick(running);
      add(`${repo.dir}/reports/hil-${prog.program_id}-${String(i + 1).padStart(2, '0')}.md`, `
# HIL integration report — ${repo.title}
**Programme:** ${prog.program_id} (${prog.model}, ${prog.eps_architecture})
**Build:** ${h.int(1, 9)}.${h.int(0, 20)}.${h.int(0, 9)} · **Rig:** HIL-${h.int(1, 6)} · **Date:** ${h.dayBetween(-2_200, -20)}
**Engineer:** ${h.pick(AUTHORS)}

## Result

${h.pick(['PASS', 'PASS', 'PASS with observations', 'FAIL — see §3'])}

## Cases

| case | description | result |
|---|---|---|
${Array.from({ length: h.int(4, 9) }, (_, k) => `| TC-${String(k + 1).padStart(3, '0')} | ${h.pick([
  'step input at 60 km/h', 'sine sweep 0.2–4 Hz', 'end-stop approach',
  'supply dip to 9 V', 'sensor fault injection', 'CAN timeout',
  'over-temperature derate', 'cold start at −40 °C', 'parking manoeuvre',
])} | ${h.chance(0.88) ? 'pass' : 'fail'} |`).join('\n')}

## Observations

${h.sample([
  'Assist recovers within the required time after the supply dip, but the recovery is not monotonic. Not a requirement; noted.',
  'Rig temperature chamber could not hold −40 °C for the full soak. Case repeated at −35 °C and extrapolated.',
  'The diagnostic trouble code raised is correct but its snapshot does not include vehicle speed.',
  'Nothing to report.',
  'Damping felt heavier than the previous build at low speed. Subjective, no measurement taken.',
], h.int(1, 3)).map((o) => `- ${o}`).join('\n')}

${h.chance(0.4) ? `## Follow-up\n\nRaised as ${implemented.length ? h.pick(implemented).chr_id : 'CHR-pending'}.` : ''}
`);
    }

    // ── per-module interface notes ────────────────────────────────────────
    //
    // One short document per module. Real repositories have these, they are
    // usually out of date, and they are the first thing anybody searching the
    // code base actually finds — which makes them the first thing that can
    // mislead.
    for (const m of repo.modules) {
      add(`${repo.dir}/docs/module-${m.file}.md`, `
# ${m.file} — interface note
**Component:** ${m.swc} · **ASIL:** ${m.asil} · **Team:** ${repo.team}
**Last reviewed:** ${h.dayBetween(-2_400, -200)} ${h.chance(0.4) ? '(overdue — annual review)' : ''}

## What it does

${h.pick([
  'Computes its output from the inputs described below and writes it to the shared torque command structure.',
  'Monitors its inputs and raises a fault if they leave the plausible range.',
  'Converts between the units used on the bus and the units used internally.',
  'Buffers samples and provides a filtered value to the callers below.',
])}

## Entry points

${m.fns.map((fn) => `- \`${fn}\``).join('\n')}

## Known issues

${h.chance(0.45) ? h.pick([
  'The ASIL in the header does not match the build configuration. Nobody has decided which is right.',
  'Not re-verified since the toolchain upgrade.',
  'Two callers rely on the previous (pre-2022) argument order. The shim is in legacy/.',
  'Stack figure in cfg/build.json predates the last change.',
]) : 'None recorded.'}
`);
    }

    // ── interface / integration documentation ─────────────────────────────
    add(`${repo.dir}/docs/integration.md`, `
# ${repo.title} — integration manual
**Revision ${h.int(1, 8)}** · ${h.dayBetween(-1_800, -40)} · ${repo.team}

## Provided interfaces

| module | function | period | ASIL |
|---|---|---|---|
${repo.modules.flatMap((m) => m.fns.filter((f) => !f.endsWith('Init')).slice(0, 2)
  .map((fn) => `| ${m.file} | \`${fn}\` | ${h.pick([1, 2, 5, 10])} ms | ${m.asil} |`)).join('\n')}

## Required interfaces

${h.sample(['vehicle speed (CAN-FD, 10 ms)', 'ignition status', 'battery voltage',
  'steering angle (SENT, 1 ms)', 'driver torque (SENT, 1 ms)', 'motor position (resolver)'],
  h.int(2, 4)).map((r) => `- ${r}`).join('\n')}

## Integration notes

${h.sample([
  'Initialise in the order given above. The arbitration module assumes its inputs are already valid.',
  'The 1 ms runnables must share a task. Splitting them across tasks introduced a one-cycle skew on H1.',
  'Do not call the apply functions from an interrupt context.',
  'Stack usage figures in cfg/build.json are measured, not estimated, and were measured at -O2.',
], h.int(2, 3)).map((n) => `- ${n}`).join('\n')}
`);
  }

  return files;
}

const cap = (s: string): string =>
  s.split('_').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');
