/**
 * Beyond lesson 5 — changing the model instead of the prompt.
 *
 * A READING OF `docs/beyond-retrieval/FINETUNING.md`.
 *
 * FOUR OF THE FIVE FIGURES ARE `cited` AND EXACTLY ONE IS `measured`, which
 * makes this the page where the badges matter most in the whole section.
 * Nothing about LoRA is built here. The one measured figure is the one that
 * would decide whether to build it, and it says the opposite of what the page's
 * subject would lead you to expect.
 *
 * THE −0.88 IS NOT IN A CHART, DELIBERATELY. `BarRows` draws
 * `width={Math.max(2, x(r.value))}` with `x(v) = (v / top) * plotW`, so a
 * NEGATIVE value renders as a 2px stub — pixel-identical to a very small
 * positive one. A chart carrying it would say "the fielded record scored near
 * zero" when it scored BELOW zero, inverting the finding. It is a `Key` instead,
 * because "it scored below zero and was still ranked first" is a relationship
 * and a bar cannot draw a relationship.
 */
import { LessonPage } from '../../components/learn/LessonPage';
import { HowItWorks } from '../../components/learn/HowItWorks';
import { Caveat, Figure, Glossary, Key, P, RunIt, SaidOutLoud, Step, Term } from '../../components/learn/kit';
import { BarRows } from '../../components/learn/charts/BarRows';
import { Funnel } from '../../components/learn/charts/Funnel';
import { Matrix } from '../../components/learn/charts/Matrix';
import { Stages } from '../../components/learn/charts/Stages';

export function Finetuning() {
  return (
    <LessonPage slug="finetuning">
      <Step n={1} title="Four things you can change, in ascending order of regret">
        <P>
          Every rung costs more and undoes less than the one before it. Almost everything belongs on the
          first two, and the honest summary of this whole track is that the interesting work is there.
        </P>

        <Figure
          title="The ladder"
          kind="illustration"
          sub="The widths are a drawing of relative commitment, not a measurement of anything. What is real is the ordering and what each step leaves you owning afterwards."
          source="docs/beyond-retrieval/FINETUNING.md §1. Nothing below the second rung is built in this repo."
        >
          <Funnel
            stages={[
              /* `op` IS THE GUTTER LABEL and the gutter is about 86 units wide —
                 `Funnel` draws it right-anchored at `left - 10` with no wrapping,
                 so a long one runs off the left edge of the viewBox and is cropped
                 silently. "days, GPUs, labelled data" did exactly that, by 79
                 units. The cost detail lives in `why`, which has the full width. */
              { n: 1, label: 'change the prompt', op: 'minutes', why: 'free and reversible — almost everything belongs here' },
              { n: 10, label: 'change the context', op: 'hours', why: 'retrieval, ordering, tools — the tracks above this one' },
              {
                n: 1000,
                label: 'change the weights',
                op: 'days',
                why: 'GPUs and labelled data, and a model you now own, store, serve and patch',
              },
              { n: 5000, label: 'change the model', op: 'a migration', why: 'somebody else’s problem, and a new eval baseline' },
            ]}
          />
        </Figure>
      </Step>

      <Step n={2} title="What LoRA actually does">
        <P>
          Full fine-tuning updates every weight and leaves you with a complete second copy of the model per
          task.{' '}
          <Term def="Low-Rank Adaptation. The base weights are frozen and two small matrices are trained beside them.">
            LoRA
          </Term>{' '}
          freezes the original and trains two small matrices alongside it.
        </P>

        <Figure
          title="One layer, adapted"
          kind="illustration"
          sub="Four steps, and two of them are the reason the technique won. A drawing — none of this runs in this repo."
          source={
            <>
              The mechanism is Hu et al., <em>LoRA: Low-Rank Adaptation of Large Language Models</em>,
              arXiv:2106.09685, fetched 2026-09-15.
            </>
          }
        >
          <Stages
            stages={[
              { verb: 'freeze', out: 'W, d×d, untouched', does: 'the base model never moves', rule: 'this is why it forgets less' },
              {
                verb: 'inject',
                out: 'A (r×d) and B (d×r)',
                does: 'two small trainable matrices beside W',
                rule: 'B starts at ZERO, so the wrapped model begins exactly equal to the base',
              },
              { verb: 'train', out: '0.06% of the parameters', does: 'gradients and optimiser state only for A and B' },
              {
                verb: 'merge',
                out: 'W + BA',
                does: 'one matrix at deploy time',
                rule: 'no added inference latency — the property that beat adapter layers',
              },
            ]}
          />
        </Figure>

        <HowItWorks
          title="The whole idea, in fifteen lines"
          path="illustrative — LoRA’s ecosystem is Python and nothing here implements it"
          shape="assembled"
          lang="python"
          plain={[
            'A frozen linear layer is wrapped. Its parameters have requires_grad set to False, so the original weights never move — that is the entire point, and it is why the base model forgets less than a full fine-tune would.',
            'Two small matrices are created beside it. A is randomly initialised; B is initialised to ZEROS, which matters more than it looks: B @ A is zero at step 0, so the wrapped model starts out exactly equal to the base model.',
            'Random-initialise both and step 0 is already a different model — and from then on you cannot tell a training bug from a bad initialisation.',
            'The scale divides by r so that changing the rank does not silently change the effective learning rate. At deploy time the whole detour merges back into one matrix, which is why there is no added inference latency.',
          ]}
          lines={[
            'class LoRALinear(nn.Module):',
            '    """Wraps a frozen Linear with a trainable rank-r detour."""',
            '    def __init__(self, base: nn.Linear, r: int = 8, alpha: int = 16):',
            '        super().__init__()',
            '        self.base = base',
            '        for p in self.base.parameters():',
            '            p.requires_grad = False          # THE POINT. W never moves.',
            '',
            '        d_in, d_out = base.in_features, base.out_features',
            '        self.A = nn.Parameter(torch.randn(r, d_in) * 0.01)',
            '        self.B = nn.Parameter(torch.zeros(d_out, r))   # ZEROS, deliberately:',
            '        # BA = 0 at init, so the wrapped model starts EXACTLY equal to the base.',
            '        self.scale = alpha / r',
            '',
            '    def forward(self, x):',
            '        return self.base(x) + (x @ self.A.T @ self.B.T) * self.scale',
          ]}
          mark={[6, 10, 11]}
          trap="Initialise both matrices randomly and the model at step 0 is already different from the base. From that point a training bug and a bad initialisation produce the same symptom, and you cannot separate them."
        />

        <Figure
          title="What it costs to train, against a full fine-tune"
          kind="cited"
          sub="The parameter counts are four orders of magnitude apart, so the smaller bar is a sliver — which is the fact rather than a drawing problem."
          source={
            <>
              CITED — Hu et al., arXiv:2106.09685, fetched 2026-09-15. GPT-3 175B, their measurement.
            </>
          }
        >
          <BarRows
            rows={[
              {
                label: 'full fine-tune, GPT-3 175B',
                value: 175000000000,
                display: '175B trainable',
                note: 'and a complete second copy of the model, per task',
              },
              {
                label: 'LoRA',
                value: 17500000,
                display: '10,000× fewer',
                note: 'GPU memory 3× lower · no added inference latency once merged',
              },
            ]}
            labelWidth={230}
          />
        </Figure>
      </Step>

      <Step n={3} title="The two-sided finding nobody quotes both halves of">
        <Figure
          title="LoRA against full fine-tuning, by what you are asking for"
          kind="cited"
          sub="It wins three rows and loses the first, and the first is the one people mean when they say “fine-tune it”. Press a row for what the claim is."
          source={
            <>
              CITED — Biderman et al., <em>LoRA Learns Less and Forgets Less</em>, 2024, fetched 2026-09-15.
            </>
          }
        >
          <Matrix
            rowHeader="what you want"
            marks={{
              live: { glyph: '●', word: 'LoRA better', colour: 'var(--lesson)' },
              wired: { glyph: '◐', word: 'comparable', colour: 'var(--color-ui-faint)' },
              refuses: { glyph: '—', word: 'full FT better', colour: 'var(--color-ui-faint)' },
            }}
            columns={['which wins']}
            rows={[
              {
                name: 'learning a new capability',
                cells: [{ state: 'refuses', detail: 'full FT learns perturbations of 10–100× the rank' }],
                explain: {
                  what: [
                    'Teaching the model something it genuinely could not do before — a new language, a new modality, a reasoning skill it does not have.',
                    'LoRA is worse at this, and the reason is structural rather than incidental: a rank-r detour can only express changes of rank r, and full fine-tuning is measured making changes of ten to a hundred times that rank.',
                    'This is the row people mean when they say "we should fine-tune it", and it is the row LoRA loses.',
                  ],
                  example: {
                    caption: 'the knob, and what it cannot buy',
                    shape: 'assembled',
                    lang: 'python',
                    lines: [
                      'config = LoraConfig(r=16)   # the detour can express rank-16 changes',
                      '',
                      '# the paper measures full fine-tuning making rank 160–1600 changes.',
                      '# raising r closes some of that gap and costs the memory saving',
                      '# that was the reason to use LoRA at all.',
                    ],
                  },
                  why: 'Worth knowing before anyone proposes LoRA for a capability gap. If the thing you need is genuinely new, the cheap method is the wrong method.',
                },
              },
              {
                name: 'retaining general ability',
                cells: [{ state: 'live', detail: 'beats weight decay and dropout at mitigating forgetting' }],
                explain: {
                  what: [
                    'Keeping everything the model could already do, while it learns the thing you want.',
                    'A full fine-tune moves every weight, so it can quietly get worse at tasks nobody thought to measure. LoRA freezes the base, so there is much less to lose.',
                    'The paper measures it beating the usual regularisation tricks — weight decay, dropout — at exactly this.',
                  ],
                  example: {
                    caption: 'why freezing is the mechanism',
                    shape: 'assembled',
                    lang: 'python',
                    lines: [
                      'for p in base.parameters():',
                      '    p.requires_grad = False   # nothing the model already knew can move',
                    ],
                  },
                  why: 'This is the half of the paper’s title people skip. "Learns less" and "forgets less" are the same property seen from two sides.',
                },
              },
              {
                name: 'output diversity',
                cells: [{ state: 'live', detail: 'maintains more diverse generations' }],
                explain: {
                  what: [
                    'Whether the tuned model still produces a range of different answers, or collapses toward one house style.',
                    'A full fine-tune on a narrow dataset tends to flatten output variety — everything starts sounding like the training set. LoRA holds more of the original range.',
                    'It matters most where the output is prose somebody reads rather than a label something parses.',
                  ],
                  example: {
                    caption: 'the failure this row is about',
                    shape: 'assembled',
                    lang: 'text',
                    lines: [
                      'before:  four different phrasings across four prompts',
                      'after :  the same opening clause every time, in the training set’s voice',
                    ],
                  },
                  why: 'A consequence of the same freezing, and the one least likely to be noticed by an eval suite that scores correctness only.',
                },
              },
              {
                name: 'memory and cost',
                cells: [{ state: 'live', detail: 'QLoRA: 65B on one 48GB GPU' }],
                explain: {
                  what: [
                    'What hardware you need to train at all. Full fine-tuning holds gradients and optimiser state for every parameter; LoRA holds them for a fraction of a percent.',
                    'Quantised LoRA takes it further — a 65B model fine-tuned on a single 48GB GPU, which is the difference between a cluster and a workstation.',
                    'This is the row that made the technique ubiquitous, and it is not the row that decides whether it will work for you.',
                  ],
                  example: {
                    caption: 'what is actually being stored',
                    shape: 'assembled',
                    lang: 'text',
                    lines: [
                      'full FT   gradients + optimiser state for 175,000,000,000 params',
                      'LoRA      gradients + optimiser state for      17,500,000 params',
                    ],
                  },
                  why: 'The cost argument is real and it is the weakest reason to choose a method. Affordability is not capability.',
                },
              },
            ]}
            footnote="Nothing here is a severity. “Full FT better” is a property of the task, not a fault in LoRA."
          />
        </Figure>
      </Step>

      <Step n={4} title="The one measured figure here, and it argues against the page">
        <P>
          The reranker is a cross-encoder trained on MS MARCO — general web prose, nothing to do with steering
          systems. If subject matter were the problem, it should score this corpus far below its training
          distribution.
        </P>

        <Figure
          title="How far out-of-domain prose actually falls"
          sub="Roughly one point apart. The out-of-domain subject matter transfers, which is the opposite of the result that would justify a fine-tune."
          source={
            <>
              MEASURED HERE — <span className="text-ui-dim">pnpm steering:retrieval-eval</span>, scores from
              docs/steering/evals/RETRIEVAL.md. The only measured figure on this page.
            </>
          }
        >
          <BarRows
            rows={[
              {
                label: 'in-domain MS MARCO pair',
                value: 8.76,
                display: '+8.76',
                note: 'what the cross-encoder was actually trained on',
              },
              {
                label: 'this corpus, prose (ret-001)',
                value: 7.75,
                display: '+7.75',
                note: 'out-of-domain subject matter, and it transfers — 1.01 points apart',
              },
            ]}
            labelWidth={230}
          />
        </Figure>

        <Key>
          The same model scored <code className="font-mono text-[0.9em]">ret-007</code>’s correct passage at{' '}
          <strong className="font-medium text-ui-fg">−0.88 and ranked it first anyway.</strong> Ranking
          depends on relative scores, not absolute ones — everything else scored lower. A low absolute score
          is not evidence of a bad ranking, and tuning to raise absolute scores would be optimising a number
          that does not drive the outcome. That is a relationship rather than a magnitude, which is why it is
          a sentence here and not a bar.
        </Key>

        <Key>
          And the predictor turns out to be document <em>shape</em>, not subject matter: terse fielded records
          like <code className="font-mono text-[0.9em]">Charge code: 1002</code> score far below prose, and
          this corpus has 220 of them. That — not “teach it about steering systems” — is the fine-tuning
          brief, if there is ever one.
        </Key>

        <HowItWorks
          title="What a local model costs before anyone fine-tunes anything"
          path="packages/grounding/src/rerank.ts:44–50"
          plain={[
            'The transformers runtime is about 200 MB and lives in optionalDependencies, so a consumer who never reranks does not pay for it.',
            'It is imported inside the function rather than at the top of the file. A top-level import would make every consumer of the package carry it — including the ingest path, which never reranks.',
            'And its absence is reported as a clear refusal rather than as a module-resolution stack trace three layers down.',
            'A fine-tune inherits all of this and more: a 7B model is 14 GB, plus a serving stack, plus a GPU, plus whoever keeps it patched.',
          ]}
          lines={[
            ' * ── AN OPTIONAL DEPENDENCY, LOADED LAZILY, AND BOTH ARE DELIBERATE ───────',
            ' *',
            ' * `@huggingface/transformers` is ~200 MB of runtime and is in',
            ' * `optionalDependencies`. A top-level import would make every consumer of this',
            ' * package pay for it — including the ingest path, which never reranks. So it is',
            ' * imported inside the function, and its absence is reported as a clear refusal',
            ' * rather than a module-resolution stack trace three layers down.',
          ]}
          mark={[2, 4]}
          trap="A hosted reranker sends passages to a third party per query. A hosted fine-tune sends your entire training set — the customer's corpus, in bulk, retained for the duration. If sending 50 passages ends the pilot, uploading the corpus does not get a hearing."
        />
      </Step>

      <RunIt
        items={[
          { cmd: 'pnpm steering:retrieval-scorer-check', does: 'the scorer against its planted failures', cost: 'free' },
          { cmd: 'pnpm steering:retrieval-eval', does: 'the scores in step 4', cost: 'money' },
          { cmd: 'RERANK=local pnpm steering:retrieval-eval --both', does: 'with the local cross-encoder — the 200 MB runtime', cost: 'money' },
        ]}
      />

      <SaidOutLoud
        then={
          <>
            “So we would never fine-tune?” Not never — but the brief would be about document shape, not about
            steering systems. Terse fielded records score far below prose on the model we already use, and we
            have 220 of them. That is a specific, measurable thing to fix, and it is not what anybody means
            when they say “train it on our data”.
          </>
        }
      >
        LoRA freezes the model and trains about a twentieth of a percent of it alongside the frozen weights,
        which is why it forgets less — and, in the same paper, why it learns less. Before spending anything
        on it we measured whether subject matter was actually the problem. It is not: a reranker trained on
        general web text scores our engineering prose within about one point of its own training data. One
        passage it scored below zero, and it still ranked that passage first, because ranking is relative.
        What does predict a bad score is the shape of the document, not what it is about.
      </SaidOutLoud>

      <Caveat
        items={[
          {
            claim: 'Nothing on this page is built here.',
            body: 'No LoRA, no fine-tune, no training run. Four of the five figures are other people’s measurements and the Python is illustrative — it is marked assembled and it is not quoted from any file in this repo.',
          },
          {
            claim: 'The one measured figure is two scores.',
            body: 'One in-domain pair against one out-of-domain passage. It is enough to say subject matter transfers on this model and it is not a domain-transfer study.',
          },
          {
            claim: 'A cross-encoder is not a generator.',
            body: 'Everything measured in step 4 is about a 22M-parameter reranker. Whether a generator would show the same subject-matter transfer on this corpus is untested, and the two are different kinds of model doing different jobs.',
          },
        ]}
      />

      <Glossary
        terms={[
          { word: 'LoRA', def: 'Low-Rank Adaptation. Freeze the base weights, train two small matrices beside them, merge at deploy time.' },
          { word: 'rank (r)', def: 'The size of the detour LoRA is allowed to learn. It bounds what the adaptation can express.' },
          { word: 'catastrophic forgetting', def: 'A tuned model getting worse at things it could already do. Freezing the base is the mechanism that limits it.' },
          { word: 'QLoRA', def: 'LoRA over a quantised base model — the variant that puts a 65B fine-tune on a single 48GB GPU.' },
          { word: 'cross-encoder', def: 'A model that scores a (query, passage) pair directly. The one measured on this page has 22M parameters and only reorders what it is given.' },
        ]}
      />
    </LessonPage>
  );
}
