/**
 * Beyond lesson 3 — a missing value must reduce access.
 *
 * A READING OF `docs/beyond-retrieval/CREDENTIALS.md`.
 *
 * FIG-CRD-2 RENDERS FOUR DENIALS AND THAT IS THE PAGE WORKING. A matrix that
 * drew a denial as a failure would invert this lesson exactly — the denials are
 * the feature, and the one row that reads as a hole (`unconfigured, dev` →
 * allowed) is the row with the longest explanation behind it, because the
 * guarantee there is made by the listener rather than by this function.
 *
 * THE SEVERITY FIGURE IS DATED AND SAYS SO. It is a count of findings from one
 * scan on one day, not a posture. A reader who takes "3 MEDIUM" as the current
 * state of the system has been misled by a figure that was accurate when it was
 * written, which is the drift failure this section keeps re-learning.
 */
import { LessonPage } from '../../components/learn/LessonPage';
import { HowItWorks } from '../../components/learn/HowItWorks';
import { Caveat, Figure, Glossary, Key, P, RunIt, SaidOutLoud, Step, Term } from '../../components/learn/kit';
import { BarRows } from '../../components/learn/charts/BarRows';
import { Funnel } from '../../components/learn/charts/Funnel';
import { Matrix } from '../../components/learn/charts/Matrix';
import { Stages } from '../../components/learn/charts/Stages';

export function Credentials() {
  return (
    <LessonPage slug="credentials">
      <Step n={1} title="Four boundaries, each with a convenient wrong answer">
        <P>
          The previous lesson was about untrusted <em>content</em> — text the model reads changing what it
          does. This one is about untrusted <em>access</em>: who may call any of this, what the model can
          reach, what we send outward, and what we say on the way out. They are legs of the same trifecta and
          they have nothing in common mechanically.
        </P>

        <Figure
          title="The four boundaries, and the rule each one is under"
          kind="illustration"
          sub="A drawing of where the decisions sit. Each of the four has an obvious implementation that fails open, which is the subject of the rest of the page."
          source="docs/beyond-retrieval/CREDENTIALS.md §1. The code behind each row is in packages/guard/ and packages/providers/foundry/."
        >
          <Stages
            stages={[
              {
                verb: 'caller',
                out: '401 · 503 · ok',
                does: 'may they use this at all?',
                rule: 'an unset key means REFUSE in production, never allow',
              },
              {
                verb: 'model',
                out: 'two named tools',
                does: 'what can it reach?',
                rule: 'a tool set is a capability grant — designing it is designing the blast radius',
              },
              {
                verb: 'provider',
                out: 'the captured request',
                does: 'what did we actually send outward?',
                rule: 'assert it — a framework default was shipping traces',
              },
              {
                verb: 'error',
                out: 'a reference, not a message',
                does: 'what did we say on the way out?',
                rule: 'nothing crosses by default',
              },
            ]}
          />
        </Figure>
      </Step>

      <Step n={2} title="The guard that cannot fail open">
        <P>
          The obvious API-key check is one line, and it is the one almost everybody writes:{' '}
          <code className="font-mono text-[0.9em] text-ui-fg">
            if (process.env.API_KEY &amp;&amp; header !== process.env.API_KEY) return 401
          </code>
          . Forget the variable in a deploy config and every request is allowed, silently, with no error
          anywhere — an unauthenticated endpoint spending money and reading claims data, shipped by omission
          and with a green deploy.
        </P>

        <Key>
          A guard must make a missing value reduce access, never grant it. That single sentence is the whole
          lesson, and the four boundaries above are four places to apply it.
        </Key>

        <HowItWorks
          title="Three branches, and why one of them allows"
          path="packages/guard/src/guard.ts:1–31"
          plain={[
            'If a key is set, the request must present it, compared in constant time. If it is unset in production, the request is REFUSED — we cannot prove the listener is loopback-only, so we decline to serve rather than assume.',
            'If it is unset in development, the request is allowed, and that is not a hole. The dev server binds 127.0.0.1, so the loopback guarantee is made by the LISTENER rather than by this function.',
            'The tempting implementation of "loopback only" is to inspect the client address or x-forwarded-for. Both are wrong: a proxy header is attacker-controlled, and by the time a request reaches application code the socket may have been through anything.',
            'The file is transport-agnostic on purpose — no Request, no Response, no framework — which is what lets a self-test exercise every branch offline, including the branches that must DENY.',
          ]}
          lines={[
            '/**',
            ' * Who may call the HTTP surface. Pillar 6.',
            ' *',
            ' * THE FAILURE THIS PREVENTS. The obvious API-key check is:',
            ' *',
            ' *     if (process.env.API_KEY && header !== process.env.API_KEY) return 401;',
            ' *',
            ' * which fails OPEN. Forget the variable in a deploy config and every request is',
            ' * allowed, silently, with no error anywhere. That is an unauthenticated endpoint',
            ' * spending money and reading claims data, shipped by omission. A guard must make',
            ' * a missing value reduce access, never grant it.',
            ' *',
            ' * WHY "UNSET = LOOPBACK ONLY" IS NOT ENFORCED BY READING AN ADDRESS. `.env.example`',
            ' * has always described unset as "loopback-only", and the tempting implementation',
            ' * is to inspect the client address or `x-forwarded-for`. Both are wrong: a proxy',
            ' * header is attacker-controlled, and by the time a request reaches application',
            ' * code the socket may have been through anything. The truthful enforcement of',
            ' * "loopback only" is the LISTENER — bind 127.0.0.1 and nothing else can reach it.',
            ' *',
            ' * So this function encodes what application code can actually know:',
            ' *',
            ' *   key set        → the request must present it. Constant-time compare.',
            ' *   key unset, dev → allowed. The dev server binds localhost; that is the',
            ' *                    loopback guarantee, made by the listener rather than here.',
            ' *   key unset, prod→ REFUSED. We cannot prove the listener is loopback-only, so',
            ' *                    we decline to serve rather than assume. Deployment without',
            ' *                    a key is a configuration error, and it should read like one.',
            ' *',
            ' * This file is transport-agnostic on purpose: no Request, no Response, no',
            ' * framework. That is what lets `pnpm guard:check` exercise every branch offline,',
            ' * including the branches that must DENY.',
          ]}
          mark={[5, 10, 25]}
          trap="The dev branch is the interesting one rather than the embarrassment. The alternative — every developer setting a secret before the app will start — is how people end up committing one."
        />

        <Figure
          title="Every branch, including the ones that must deny"
          sub="Four of the six rows are denials and that is the point. Press a row for what it means and why it lands where it does."
          source={
            <>
              MEASURED HERE — <span className="text-ui-dim">pnpm guard:check</span>, free and offline, over
              packages/guard/src/guard.ts.
            </>
          }
        >
          <Matrix
            rowHeader="configuration"
            marks={{
              live: { glyph: '●', word: 'allowed', colour: 'var(--lesson)' },
              wired: { glyph: '◐', word: 'partial', colour: 'var(--color-ui-faint)' },
              refuses: { glyph: '✕', word: 'denied', colour: 'var(--color-ui-faint)' },
            }}
            columns={['outcome']}
            rows={[
              {
                name: 'unconfigured, production',
                cells: [{ state: 'refuses', detail: '503 — declines to serve rather than assume' }],
                explain: {
                  what: [
                    'The API key environment variable is not set, and the app believes it is running in production.',
                    'It refuses every request with a 503. Not a 401 — a 401 would say "you are not authorised", and the truth is that the server is not configured to make that judgement at all.',
                    'This is the branch that the one-line check everybody writes gets wrong: that version would allow every request instead.',
                  ],
                  example: {
                    caption: 'the shape of the check this replaced',
                    shape: 'assembled',
                    lang: 'typescript',
                    lines: [
                      '// fails OPEN — delete the variable and the endpoint is public',
                      'if (process.env.API_KEY && header !== process.env.API_KEY) return 401;',
                      '',
                      '// fails CLOSED — an unset variable is a configuration error',
                      "if (!key) return mode === 'production' ? deny(503) : allow();",
                    ],
                  },
                  why: 'A deployment without a key is a configuration error and it should read like one. 503 is the status that says "this server cannot serve", which is exactly what is true.',
                },
              },
              {
                name: 'unconfigured, dev',
                cells: [{ state: 'live', detail: 'the LISTENER binds loopback; that is the guarantee' }],
                explain: {
                  what: [
                    'The key is unset and the app is running on a developer machine. The request is allowed.',
                    'That looks like the hole the row above closes, and it is not, because the guarantee is made somewhere else: the dev server binds 127.0.0.1, so nothing outside the machine can reach it in the first place.',
                    'The alternative — requiring every developer to set a secret before the app will start — is one of the most reliable ways to get a secret committed to a repository.',
                  ],
                  example: {
                    caption: 'where the actual guarantee lives',
                    shape: 'assembled',
                    lang: 'bash',
                    lines: [
                      '# the listener, not the guard, is what makes "loopback only" true',
                      'vite --host 127.0.0.1',
                      '',
                      '# the wrong way to enforce it — both of these are attacker-controlled',
                      "#   req.headers['x-forwarded-for']",
                      '#   req.socket.remoteAddress   (after any proxy)',
                    ],
                  },
                  why: 'Application code cannot truthfully know whether it is reachable from outside. It can only know whether it was configured. So the rule it encodes is about configuration, and the network property is enforced in the layer that owns it.',
                },
              },
              {
                name: 'configured, no header',
                cells: [{ state: 'refuses', detail: '401' }],
                explain: {
                  what: [
                    'A key is set and the request did not present one. Denied with a 401.',
                    'This is the ordinary case and the only one most people think about when they write an API-key check.',
                  ],
                  example: {
                    caption: 'the denial, as the self-test asserts it',
                    shape: 'assembled',
                    lang: 'typescript',
                    lines: [
                      "expect(decide({ key: 'secret', header: undefined })).toEqual({ ok: false, status: 401 });",
                    ],
                  },
                  why: 'Asserted as a DENIAL, in both directions. A guard suite that only tests the allow path is indistinguishable from one that allows everything.',
                },
              },
              {
                name: 'configured, wrong key',
                cells: [{ state: 'refuses', detail: '401, constant-time compare' }],
                explain: {
                  what: [
                    'A key is set and the request presented a different one. Denied.',
                    'The comparison is constant-time — it takes the same length of time whether the first character is wrong or only the last one is.',
                    'A normal string comparison returns as soon as it finds a difference, and the timing of that return leaks how much of the key was right. Given enough attempts, that recovers the key one character at a time.',
                  ],
                  example: {
                    caption: 'why the comparison is not ===',
                    shape: 'assembled',
                    lang: 'typescript',
                    lines: [
                      "// leaks: returns faster for 'aaaa' than for 'secre' when the key is 'secret'",
                      'if (header !== key) return deny();',
                      '',
                      '// constant-time: the same work regardless of where the mismatch is',
                      'if (!timingSafeEqual(Buffer.from(header), Buffer.from(key))) return deny();',
                    ],
                  },
                  why: 'A timing side-channel on an API key is a slow attack and a real one. It costs nothing to close.',
                },
              },
              {
                name: 'configured, right key',
                cells: [{ state: 'live', detail: 'the only allow path in production' }],
                explain: {
                  what: [
                    'A key is set and the request presented it. Allowed.',
                    'This is the only path by which a production request is served. Everything else on this grid is a denial or a development convenience.',
                  ],
                  example: {
                    caption: 'the one production allow',
                    shape: 'assembled',
                    lang: 'bash',
                    lines: ["curl -H 'x-api-key: …' https://…/api/ask   # 200"],
                  },
                  why: 'Worth stating plainly because it is easy to lose in a list of denials: in production there is exactly one way in.',
                },
              },
              {
                name: 'empty-string key',
                cells: [{ state: 'refuses', detail: '503 — an empty string is not “configured”' }],
                explain: {
                  what: [
                    'The environment variable exists but is set to the empty string. That is treated as unset, not as a key whose value happens to be empty.',
                    'It matters because an empty string is falsy in some checks and present in others — `process.env.API_KEY === undefined` is false, while `if (process.env.API_KEY)` is also false.',
                    'A guard that tested for presence rather than for content would treat this as configured and then compare every incoming header against "". Any request sending an empty header would be allowed.',
                  ],
                  example: {
                    caption: 'the case that splits presence from content',
                    shape: 'assembled',
                    lang: 'bash',
                    lines: [
                      'API_KEY=          # set, and empty',
                      '',
                      '# "in" says configured, truthiness says not — and they disagree',
                      "#   'API_KEY' in process.env   → true",
                      '#   Boolean(process.env.API_KEY) → false',
                    ],
                  },
                  why: 'This is the row that exists because somebody thought about it, rather than because something broke. An empty value in a deploy config is a very ordinary mistake.',
                },
              },
            ]}
            footnote="Four denials out of six, and that is the feature. Nothing here takes a severity colour — a denial is the guard working, not an error."
          />
        </Figure>
      </Step>

      <Step n={3} title="What an exception is allowed to say">
        <P>
          The obvious catch block forwards the exception’s message, which is fine right up until the throw
          comes from the database driver — and then the caller is handed the project id, the pooler, the
          region and the provider, none of which they asked for.
        </P>

        <HowItWorks
          title="Why the error goes to the log and the caller gets a reference"
          path="packages/guard/src/public-error.ts:1–28"
          plain={[
            'An exception is logged in full, and the caller receives a short reference that joins their report to that log entry. Nothing is lost — the operator still has the whole text.',
            'The failure this prevents is specific: a database driver error carries the hostname, and that hostname carries the project id, the region and the provider. The same block cheerfully forwards absolute build paths and the user and host halves of a connection string.',
            'The alternative — scrubbing hostnames and paths out of the message before forwarding it — is a denylist over every string any dependency might ever throw. That is a guess that holds until a driver phrases its error differently.',
            'So nothing crosses by default. The trade is that an operator reading a screenshot loses one hop, and a caller gains nothing they can use.',
          ]}
          lines={[
            '/**',
            ' * What an exception is allowed to tell the caller. Pillar 6, same file family',
            ' * as the key check for the same reason: both are decisions about what crosses',
            ' * the boundary.',
            ' *',
            ' * THE FAILURE THIS PREVENTS. The obvious catch block is:',
            ' *',
            ' *     catch (e: any) { return json({ error: e?.message ?? String(e) }, 503) }',
            ' *',
            ' * which is fine until the throw comes from the database driver. Then the',
            ' * caller is handed',
            ' *',
            ' *     getaddrinfo ENOTFOUND ep-shy-tree-xxxxxxx-pooler.c-2.eu-central-1.aws.neon.tech',
            ' *',
            ' * and now they know the project id, the pooler, the region and the provider —',
            ' * none of which they asked for and none of which they need. The same block',
            ' * cheerfully forwards absolute build paths, internal hostnames, and the',
            ' * user/host halves of a connection string in an auth error.',
            ' *',
            ' * SO: the exception goes to the LOG, and the caller gets a reference to it.',
            ' * Nothing is lost — `az containerapp logs show` still has the full text, and',
            ' * the ref is what joins the two. That trade is deliberate: an operator reading',
            ' * a screenshot loses one hop, and a caller gains nothing they can use.',
            ' *',
            ' * WHY NOT REDACT AND FORWARD. Scrubbing hostnames and paths out of the message',
            ' * is a denylist, and a denylist over "every string a dependency might throw" is',
            ' * a guess that holds until some driver phrases its error differently.',
            ' * The boundary is easier to defend when nothing crosses it by default.',
          ]}
          mark={[7, 12, 19, 25]}
          trap="A denylist over arbitrary third-party error strings cannot be completed. The boundary is only defensible when the default is that nothing crosses it."
        />
      </Step>

      <Step n={4} title="What a real scan found here, including what was not fixed">
        <Figure
          title="Eight findings, by severity — from one scan, on one day"
          sub="This is a count from a dated review, not a current posture. Two of the three MEDIUMs were about publishing things that were never secrets and did not need to be published anyway."
          source={
            <>
              MEASURED HERE — docs/SECURITY-REVIEW.md, 8 findings. The date on that document is the date this
              figure is true of; it is not re-run on a schedule.
            </>
          }
        >
          <BarRows
            rows={[
              {
                label: 'MEDIUM',
                value: 3,
                display: '3',
                note: 'identity map published · dev server on every interface · unhandled pg Pool error',
              },
              {
                label: 'LOW',
                value: 3,
                display: '3',
                note: 'raw errors to clients · deploy job does not assert the guard · dependency advisories',
              },
              { label: 'INFO', value: 2, display: '2', note: 'build artifacts committed · a dead env var' },
            ]}
            labelWidth={120}
            axis="0 → 3 findings"
          />
        </Figure>

        <Figure
          title="The resolution that is the actual lesson"
          sub="Five real identifiers were committed in a public file. They were redacted, and the last row is the one worth reading — it is an ACCEPTED risk, not a fixed one."
          source="MEASURED HERE — docs/SECURITY-REVIEW.md finding 1, and the commit that redacted it."
        >
          <Funnel
            stages={[
              { n: 5, label: 'real GUIDs in a public file', op: 'committed' },
              {
                n: 0,
                label: 'still in the working tree',
                op: 'redacted',
                why: 'the prose is unchanged — its value was the explanation, not the identifiers',
              },
              {
                n: 5,
                label: 'still reachable in git history',
                why: 'ACCEPTED. A force-push would not remove them: orphaned commits stay addressable by SHA.',
              },
            ]}
            note="Which is the honest shape of most secret-in-a-repo findings. Rotating the thing is the fix; scrubbing the history is theatre unless the hosting provider garbage-collects on request, and even then a clone taken in the meantime is gone."
          />
        </Figure>

        <Key>
          A <Term def="A finding a team has read, understood and decided not to fix, with the reason written down.">
            recorded acceptance
          </Term>{' '}
          is a different artefact from an unnoticed hole, and the difference is entirely in whether somebody
          wrote down why.
        </Key>
      </Step>

      <RunIt
        items={[
          { cmd: 'pnpm guard:check', does: 'every branch, including every denial', cost: 'free' },
          { cmd: 'pnpm compliance:check', does: 'the real outgoing request — store:false, tracing off', cost: 'free' },
          { cmd: 'pnpm compliance:mastra', does: 'the same, for the second engine', cost: 'free' },
          { cmd: 'pnpm pharma:sql-check', does: 'the answer path cannot write to a system of record', cost: 'free' },
          { cmd: 'pnpm env:check', does: 'is .env filled in', cost: 'free' },
        ]}
      />

      <SaidOutLoud
        then={
          <>
            “What happens if someone deletes the key from the deploy config?” The service returns 503 and
            stops answering. That is the intended behaviour and it is asserted by a test — the version most
            people write would have served every request instead, with nothing in any log to say so.
          </>
        }
      >
        The API-key check almost everyone writes fails open: if the environment variable goes missing, the
        condition is never true, and every request is allowed with a green deploy and nothing in the logs.
        Ours refuses instead — a missing value has to reduce access, never grant it. The same rule runs
        through the error path: an exception goes to our log and the caller gets a reference number, because
        a database error message carries the hostname, and the hostname carries the region, the provider and
        the project id.
      </SaidOutLoud>

      <Caveat
        items={[
          {
            claim: 'The severity counts are from one dated scan.',
            body: 'Eight findings, reviewed on one day, on one snapshot of the repo. Nothing re-runs it on a schedule, so the figure is a record of that review rather than a statement about the code today.',
          },
          {
            claim: 'guard:check proves the function, not the deployment.',
            body: 'Every branch is exercised offline, including the denials. Whether the deployed listener actually binds loopback in development, and whether the production environment really sets the variable, are facts about infrastructure that no unit test can reach — and one of the LOW findings is precisely that the deploy job does not assert it.',
          },
          {
            claim: 'The committed identifiers are accepted, not removed.',
            body: 'They remain reachable by SHA in git history and always will. That is written down as an acceptance because the alternative — claiming a force-push removed them — would be false.',
          },
        ]}
      />

      <Glossary
        terms={[
          { word: 'fail open', def: 'A control that stops controlling when its configuration is missing, allowing what it was meant to deny.' },
          { word: 'fail closed', def: 'The opposite, and the only acceptable default for a guard: absence of configuration reduces access.' },
          { word: 'constant-time compare', def: 'A comparison that takes the same time whatever the input, so the duration does not leak how much of a secret was correct.' },
          { word: 'capability grant', def: 'The set of tools an agent is given. It is the blast radius: a model cannot do a thing it has no tool for, however convinced it is.' },
          { word: 'accepted risk', def: 'A finding understood and deliberately not fixed, with the reasoning recorded. Distinct from one nobody noticed.' },
        ]}
      />
    </LessonPage>
  );
}
