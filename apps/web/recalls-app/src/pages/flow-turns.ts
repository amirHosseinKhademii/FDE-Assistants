/**
 * The walk, as three turns.
 *
 * ── WHAT MAKES THIS WALK DIFFERENT FROM THE OTHER TWO ──────────────────────
 *
 * Pharma's reads twenty-nine times across six systems of record. Vantis' reads
 * one system of record exactly once and works from a derived database. Both
 * describe a corpus somebody here wrote, so the residency section of each is
 * true and weightless: nothing could leak because nothing was real.
 *
 * Here the narratives are filed by members of the public about their own cars.
 * 939 of 956 carry a truncated VIN and 39 name a family member. So the
 * interesting column on this page is not which store was read — it is
 * `crosses`, and the honest answer changes between turn 2 and turn 3.
 *
 * ── TURN 3 IS MARKED AS NOT BUILT, AND STAYS THAT WAY UNTIL IT IS ──────────
 *
 * The desk does not exist: the answer contract is written after an answer key
 * has been made by hand from the raw files, which is step 4 of a build that is
 * at step 0. Describing the request it WOULD make is useful — it is the step
 * where this corpus first leaves the machine, and that is worth deciding before
 * it is built rather than after. Describing it as though it runs would not be.
 */
import type { Turn } from '@veresk/surface';

export const FLOW_TURNS: Turn[] = [
  {
    label: 'fetch',
    n: '1',
    note: 'Pulling a slice of the public record onto disk. Runs offline, once, and not while anybody is waiting.',
    plain: 'We ask a US government API for every complaint and recall on a given vehicle, and write what comes back to a file.',
    example: 'make=honda · model=odyssey · modelYear=2019',
    crosses: true,
    hops: [
      {
        where: 'crosses',
        // `crosses` is right — this leaves Calder's network. The DEFAULT LABEL
        // is not: at this point in the story no model exists, and what crossed
        // was a request to a federal agency. `where` encodes whether it left;
        // `label` names who received it.
        label: 'crosses to NHTSA',
        title: 'a make, a model and a year',
        payload: 'GET api.nhtsa.gov/complaints/complaintsByVehicle?make=…',
        detail:
          'The only thing sent is the vehicle being asked about. No customer data exists at this point — the corpus has not been read yet, and Calder has no record of its own to send.',
      },
      {
        where: 'back',
        label: 'from NHTSA',
        title: 'NHTSA answers',
        payload: '956 complaints · JSON',
        detail:
          'A US federal agency, and the data is public domain. This hop crosses a boundary and carries nothing sensitive in the outbound direction, which is the opposite of every other crossing on this site.',
      },
      {
        where: 'yours',
        title: 'written to disk, unmodified',
        payload: 'complaints/2019-honda-odyssey.json',
        detail:
          'Stored exactly as returned, including the 13% of narratives filed in capitals. Normalising them here would be editing the evidence before anybody has read it.',
      },
    ],
  },

  {
    label: 'index',
    n: '2',
    note: 'Turning narratives into something searchable. Also offline, and nothing leaves the machine.',
    plain: 'Each narrative is cut into passages and turned into numbers so that a later question can find it. The model that does that runs here.',
    example: 'bge-small · 384 dimensions · on this machine',
    crosses: false,
    hops: [
      {
        where: 'yours',
        title: 'cut into passages',
        payload: 'narrative → chunks, each remembering its ODI number',
        detail:
          'The identifier travels with the passage. On this engagement that matters more than usual: a citation here is a filing a reader can look up themselves, which is not true of the other three corpora.',
      },
      {
        where: 'yours',
        title: 'embedded locally',
        payload: 'bge-small, 384 dims',
        detail:
          'The embedding model runs on this machine, so the narratives are never sent anywhere to be indexed. Measured on the sibling engagement, a local index scored the same recall as a paid hosted one — so this is free and no worse.',
      },
      {
        where: 'yours',
        title: 'stored',
        payload: 'postgres + pgvector',
        detail:
          'One table, in a database Calder controls. Nothing about this step reaches a third party.',
      },
    ],
  },

  {
    label: 'ask — NOT BUILT',
    n: '3',
    note: 'The step where this corpus would first leave the machine. It does not exist yet, and what it sends is a decision to take before writing it, not after.',
    plain: 'When somebody asks a question, the passages that answer it are put in front of a model — and that model is somebody else’s.',
    example: 'not implemented — see docs/recalls/PLAN.md §8, step 5',
    crosses: true,
    hops: [
      {
        where: 'browser',
        title: 'the analyst asks',
        payload: '"is the sliding-door problem a known defect, and is the remedy holding?"',
        detail:
          'A question about a vehicle, typed by an employee of the customer. Nothing personal in itself.',
      },
      {
        where: 'yours',
        title: 'search picks the passages',
        payload: '6 of 3,800 passages',
        detail:
          'Chosen here, by the local index. Up to this point every byte has stayed on machines Calder controls.',
      },
      {
        where: 'crosses',
        title: 'the passages go to the model provider',
        payload: 'the narratives themselves, verbatim',
        detail:
          'THIS IS THE HOP THAT MATTERS. Those passages are what members of the public wrote about their own cars — 939 of 956 carry a partial VIN, and 39 name a family member. They are already public, which makes this defensible; it does not make it automatic, and a free tier that trains on what it is sent would be the wrong place to send them.',
      },
      {
        where: 'back',
        title: 'an answer, with identifiers',
        payload: 'finding + ODI numbers + an escalation',
        detail:
          'Every claim carries the filing it rests on, so the reader can check it against nhtsa.gov rather than against us. Where two records disagree it says so and names who must decide.',
      },
    ],
  },
];
