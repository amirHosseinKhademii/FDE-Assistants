/**
 * Every visible string on the front page, in each language.
 *
 * One layout renders both languages (`pages/VereskLanding.tsx`). The layout
 * fields of each demo (position, colour, icon, link) stay with the layout, and
 * everything a visitor reads lives here. Company and product names are the same
 * in both languages and appear as written.
 *
 * The English block is the copy as it was before this file existed. Change it
 * only on purpose, because the English page is the one people already read.
 */

export type Lang = 'en' | 'sv';

export type DemoId = 'pharma' | 'safety' | 'steering' | 'commerce' | 'bostad';

export interface DemoCopy {
  sub: string;
  label: string;
  text: string;
  agent?: string;
}

export interface StepCopy {
  title: string;
  body: string;
}

export interface Copy {
  /** The page title. Only the Swedish route sets it, the English route keeps its own. */
  title: string;
  description: string;
  nav: {
    learn: string;
    pharma: string;
    safety: string;
    steering: string;
    commerce: string;
    bostad: string;
    languageLabel: string;
  };
  hero: {
    heading: string;
    lead: string;
    demosIntro: string;
  };
  hub: {
    groupLabel: string;
    notOpen: string;
  };
  demos: Record<DemoId, DemoCopy>;
  demosOpen: string;
  howTitle: string;
  steps: StepCopy[];
  agentsTitle: string;
  agentsLead: string;
  agentSteps: StepCopy[];
  agentsClose: string;
  demosTitle: string;
  demosLead: string;
  openDemo: string;
  notOpenHere: string;
  buildTitle: string;
  buildLead: string;
  buildLink: string;
  footer: string;
}

export const COPY: Record<Lang, Copy> = {
  en: {
    title: 'Veresk: AI assistants that answer from your documents',
    description: '',
    nav: {
      learn: 'Learn',
      pharma: 'Meridian Pharma',
      safety: 'Calder Safety',
      steering: 'Vantis Steering',
      commerce: 'Thornbury Goods',
      bostad: 'Bostad',
      languageLabel: 'Language',
    },
    hero: {
      heading: 'AI assistants that answer from your own documents, with sources.',
      lead: 'Veresk builds AI assistants for companies. They read your documents and systems, answer questions in plain language, and show exactly where each answer comes from. When the answer is not in your data, they say so. On top of that, we build AI agents that do the work for you, not just answer questions.',
      demosIntro: 'Five working demos. Click one to try it.',
    },
    hub: {
      groupLabel: 'Five demos, connected to Veresk',
      notOpen: 'Not open from here yet',
    },
    demos: {
      pharma: {
        sub: 'Meridian Pharma',
        label: 'Batch release.',
        text: 'Checks whether a medicine batch can ship, using the lab records and procedures, and names what would stop it.',
        agent: 'An agent checks the batch record against the procedures and flags any gap.',
      },
      safety: {
        sub: 'Calder Safety',
        label: 'Vehicle safety and recalls.',
        text: 'Answers recall and safety questions from public NHTSA complaint filings. It says so when the filings do not settle the question.',
      },
      steering: {
        sub: 'Vantis Steering',
        label: 'Engineering requirements.',
        text: 'Reads a customer’s requirements and says, for each one, whether we have built it before, need to change it, or must build it new.',
      },
      commerce: {
        sub: 'Thornbury Goods',
        label: 'Customer service.',
        text: 'Handles a return or refund case, checks it against the store’s policy, and asks a person before any money moves.',
        agent: 'An agent drafts the refund and waits for a person to approve it.',
      },
      bostad: {
        sub: 'Göteborg housing',
        label: 'Housing in Gothenburg.',
        text: 'Search any address or housing association and get an area profile, the association’s financial health and answers about the area, with sources.',
      },
    },
    demosOpen: 'Open the demo →',
    howTitle: 'How it works',
    steps: [
      {
        title: 'Connect',
        body: 'We load your documents, manuals and databases. Nothing leaves your control.',
      },
      {
        title: 'Ask',
        body: 'Your team asks a question the way they would ask a colleague.',
      },
      {
        title: 'Answer with proof',
        body: 'The assistant answers and links to the exact page, row or record it used.',
      },
      {
        title: 'Measure',
        body: 'A test suite checks the answers, so you know it works before you rely on it.',
      },
    ],
    agentsTitle: 'Agents that do the work',
    agentsLead: 'An assistant answers. An agent acts. We connect agents to the systems you already use, so routine work gets done and people only step in where judgement is needed.',
    agentSteps: [
      {
        title: 'Prepare the paperwork',
        body: 'Drafts reports, checklists and replies from your own data, ready for a person to approve.',
      },
      {
        title: 'Check before it goes out',
        body: 'Compares every case against your rules and flags what is missing or wrong.',
      },
      {
        title: 'Act in your systems',
        body: 'Creates the ticket, updates the record or starts the refund, and logs what it did.',
      },
      {
        title: 'Ask a person when it matters',
        body: 'Stops and asks for approval before money moves or a risky decision is made.',
      },
    ],
    agentsClose: 'You stay in control. Every step is logged and every answer points to its source.',
    demosTitle: 'Try the five demos',
    demosLead: 'Each demo is a working app for one kind of company. The four business demos use made-up companies and documents. Bostad uses real public data about Gothenburg.',
    openDemo: 'Open the demo →',
    notOpenHere: 'Not open from here yet.',
    buildTitle: 'Want to see how it is built?',
    buildLead: 'Short lessons explain how these assistants are made and how they are tested.',
    buildLink: 'Start the lessons →',
    footer: 'Veresk. Companies, people and documents in the business demos are made up. Bostad uses public data.',
  },
  sv: {
    title: 'Veresk: AI-assistenter som svarar ur era egna dokument',
    description: 'Veresk bygger AI-assistenter för företag. De svarar på frågor ur era egna dokument och visar källan till varje svar.',
    nav: {
      learn: 'Lektioner',
      pharma: 'Meridian Pharma',
      safety: 'Calder Safety',
      steering: 'Vantis Steering',
      commerce: 'Thornbury Goods',
      bostad: 'Bostad',
      languageLabel: 'Språk',
    },
    hero: {
      heading: 'AI-assistenter som svarar ur era egna dokument, med källa.',
      lead: 'Veresk bygger AI-assistenter för företag. De läser era dokument och system, svarar på frågor med vanligt språk och visar exakt varifrån varje svar kommer. Om svaret inte finns i era uppgifter säger de det. Vi bygger också AI-agenter som gör jobbet åt dig, inte bara svarar på frågor.',
      demosIntro: 'Fem fungerande demoversioner. Klicka på en för att prova den.',
    },
    hub: {
      groupLabel: 'Fem demoversioner, kopplade till Veresk',
      notOpen: 'Inte öppen härifrån ännu',
    },
    demos: {
      pharma: {
        sub: 'Meridian Pharma',
        label: 'Frisläppning av batch.',
        text: 'Kontrollerar om en batch med läkemedel får släppas ut, med hjälp av labbjournalerna och rutinerna, och pekar ut vad som skulle stoppa den.',
        agent: 'En agent jämför batchjournalen med rutinerna och flaggar alla brister.',
      },
      safety: {
        sub: 'Calder Safety',
        label: 'Fordonssäkerhet och återkallelser.',
        text: 'Svarar på frågor om återkallelser och säkerhet utifrån offentliga klagomålsanmälningar till NHTSA. Den säger det när anmälningarna inte räcker för att avgöra frågan.',
      },
      steering: {
        sub: 'Vantis Steering',
        label: 'Tekniska krav.',
        text: 'Läser en kunds krav och säger för varje krav om vi har byggt det förut, behöver ändra det eller måste bygga det nytt.',
      },
      commerce: {
        sub: 'Thornbury Goods',
        label: 'Kundservice.',
        text: 'Hanterar ett returärende eller ett återbetalningsärende, kontrollerar det mot butikens regler och frågar en person innan några pengar flyttas.',
        agent: 'En agent skriver ett utkast till återbetalningen och väntar på att en person godkänner den.',
      },
      bostad: {
        sub: 'Bostäder i Göteborg',
        label: 'Boende i Göteborg.',
        text: 'Sök på valfri adress eller bostadsförening och få en områdesprofil, föreningens ekonomiska hälsa och svar om området, med källor.',
      },
    },
    demosOpen: 'Öppna demoversionen →',
    howTitle: 'Så fungerar det',
    steps: [
      {
        title: 'Koppla',
        body: 'Vi laddar in era dokument, manualer och databaser. Ingenting lämnar er kontroll.',
      },
      {
        title: 'Fråga',
        body: 'Ditt team ställer en fråga på samma sätt som de skulle fråga en kollega.',
      },
      {
        title: 'Svar med bevis',
        body: 'Assistenten svarar och länkar till den exakta sidan, raden eller posten den använde.',
      },
      {
        title: 'Mät',
        body: 'Ett testset kontrollerar svaren, så att du vet att de fungerar innan du litar på dem.',
      },
    ],
    agentsTitle: 'Agenter som gör jobbet',
    agentsLead: 'En assistent svarar. En agent agerar. Vi kopplar agenter till de system du redan använder, så att rutinarbetet blir gjort och människor bara behöver ingripa där omdöme krävs.',
    agentSteps: [
      {
        title: 'Förbered pappersarbetet',
        body: 'Skriver utkast till rapporter, checklistor och svar utifrån era egna uppgifter, redo för en person att godkänna.',
      },
      {
        title: 'Kontrollera innan det skickas',
        body: 'Jämför varje ärende mot era regler och flaggar det som saknas eller är fel.',
      },
      {
        title: 'Agera i era system',
        body: 'Skapar ärendet, uppdaterar posten eller startar återbetalningen, och loggar vad den gjorde.',
      },
      {
        title: 'Fråga en person när det spelar roll',
        body: 'Stannar och ber om godkännande innan pengar flyttas eller ett riskfyllt beslut fattas.',
      },
    ],
    agentsClose: 'Du har kontrollen. Varje steg loggas och varje svar pekar på sin källa.',
    demosTitle: 'Prova de fem demoversionerna',
    demosLead: 'Varje demoversion är en fungerande app för en typ av företag. De fyra företagsdemoversionerna använder påhittade företag och dokument. Bostad använder verklig offentlig data om Göteborg.',
    openDemo: 'Öppna demoversionen →',
    notOpenHere: 'Inte öppen härifrån ännu.',
    buildTitle: 'Vill du se hur det är byggt?',
    buildLead: 'Korta lektioner förklarar hur de här assistenterna görs och hur de testas.',
    buildLink: 'Börja lektionerna →',
    footer: 'Veresk. Företagen, personerna och dokumenten i företagsdemoversionerna är påhittade. Bostad använder offentlig data.',
  },
};
