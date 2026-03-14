export type LeadDiscoveryNotesPayload = {
  lead_context: {
    desired_outcome: {
      trigger_for_call: string | null;
      expected_solution: string[];
    };
    current_situation: {
      experience_level: string | null;
      decision_process: string | null;
    };
    problem: {
      main_obstacle: string | null;
      attempted_solutions: string[];
      duration_of_problem: string | null;
    };
    goal: {
      ideal_result: string | null;
      expected_timeline: string | null;
    };
    cost_of_inaction: {
      impact_if_no_action: string | null;
      potential_losses: string[];
      history_of_delayed_decisions: string | null;
    };
    interest_level: {
      seriousness: string | null;
      decision_stage: string | null;
    };
  };
  meta: {
    source: 'frontend_discovery_notes';
    language: string | null;
    has_missing_fields: boolean;
  };
};

type NullableString = string | null | undefined;
type MultiValueInput = string | string[] | null | undefined;

export type RawLeadDiscoveryNotesInput =
  | string
  | {
      lead_context?: {
        desired_outcome?: {
          trigger_for_call?: NullableString;
          expected_solution?: MultiValueInput;
        };
        current_situation?: {
          experience_level?: NullableString;
          decision_process?: NullableString;
        };
        problem?: {
          main_obstacle?: NullableString;
          attempted_solutions?: MultiValueInput;
          duration_of_problem?: NullableString;
        };
        goal?: {
          ideal_result?: NullableString;
          expected_timeline?: NullableString;
        };
        cost_of_inaction?: {
          impact_if_no_action?: NullableString;
          potential_losses?: MultiValueInput;
          history_of_delayed_decisions?: NullableString;
        };
        interest_level?: {
          seriousness?: NullableString;
          decision_stage?: NullableString;
        };
      };
      meta?: {
        language?: NullableString;
      };
      trigger_for_call?: NullableString;
      expected_solution?: MultiValueInput;
      experience_level?: NullableString;
      decision_process?: NullableString;
      main_obstacle?: NullableString;
      attempted_solutions?: MultiValueInput;
      duration_of_problem?: NullableString;
      ideal_result?: NullableString;
      expected_timeline?: NullableString;
      impact_if_no_action?: NullableString;
      potential_losses?: MultiValueInput;
      history_of_delayed_decisions?: NullableString;
      seriousness?: NullableString;
      decision_stage?: NullableString;
      language?: NullableString;
      raw_notes?: NullableString;
      notes?: NullableString;
    };

type ParsedAnswerMap = Record<string, string | null>;
type RawLeadDiscoveryNotesObject = Exclude<RawLeadDiscoveryNotesInput, string>;
type FlatStringFieldKey =
  | 'trigger_for_call'
  | 'experience_level'
  | 'decision_process'
  | 'main_obstacle'
  | 'duration_of_problem'
  | 'ideal_result'
  | 'expected_timeline'
  | 'impact_if_no_action'
  | 'history_of_delayed_decisions'
  | 'seriousness'
  | 'decision_stage'
  | 'language'
  | 'raw_notes'
  | 'notes';
type FlatArrayFieldKey =
  | 'expected_solution'
  | 'attempted_solutions'
  | 'potential_losses';

const QUESTION_TO_FIELD_KEY: Record<string, keyof ParsedAnswerMap> = {
  'Ce l-a determinat să își programeze acest apel?': 'trigger_for_call',
  'Ce speră să obțină de la o soluție ca aceasta?': 'expected_solution',
  'Ce experiență are în domeniul tranzacționării/investițiilor?': 'experience_level',
  'A mai folosit roboți de tranzacționare sau alte sisteme automatizate?': 'experience_level',
  'Cum ia de obicei decizii financiare? (Caută mult, se bazează pe intuiție, se sfătuiește cu cineva?)':
    'decision_process',
  'Care este cel mai mare obstacol pe care îl întâmpină în obținerea rezultatelor dorite?':
    'main_obstacle',
  'Ce metode a încercat în trecut și ce nu a funcționat?': 'attempted_solutions',
  'De cât timp se confruntă cu această problemă?': 'duration_of_problem',
  'Care ar fi rezultatul ideal pentru el? (Ex. venit pasiv, scalare rapidă, mai mult timp liber)':
    'ideal_result',
  'Cât de repede și-ar dori să vadă rezultate?': 'expected_timeline',
  'Dacă nu face această investiție acum, ce impact ar avea asupra obiectivelor sale?':
    'impact_if_no_action',
  'Ce pierderi ar avea dacă amână decizia?': 'potential_losses',
  'A mai amânat astfel de decizii în trecut? Cum a fost impactat de asta?':
    'history_of_delayed_decisions',
  'Cât de serios pare? Este în faza de explorare sau pregătit să ia o decizie?':
    'seriousness',
  'Are un termen clar pentru luarea unei decizii? (Ex. „Vreau să iau o decizie luna aceasta” vs. „Doar mă uit să văd ce opțiuni există”)':
    'decision_stage',
  'Pare să aibă nevoie de mai multe informații sau de validare socială (testimoniale, studii de caz)?':
    'decision_stage',
};

const FIELD_KEYS = [
  'trigger_for_call',
  'expected_solution',
  'experience_level',
  'decision_process',
  'main_obstacle',
  'attempted_solutions',
  'duration_of_problem',
  'ideal_result',
  'expected_timeline',
  'impact_if_no_action',
  'potential_losses',
  'history_of_delayed_decisions',
  'seriousness',
  'decision_stage',
] as const;

const SECTION_LINE_PATTERN = /^\d+\.\s+/;
const ANSWER_PREFIX_PATTERN = /^r[ăa]spuns\s*:/i;
const BULLET_PATTERN = /^[\-\u2022*]\s*/;

const normalizeText = (value: NullableString) => {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\r\n/g, '\n').trim();
  return normalized === '' ? null : normalized;
};

const normalizeInlineWhitespace = (value: NullableString) => {
  const normalized = normalizeText(value);
  return normalized ? normalized.replace(/[ \t]+/g, ' ').trim() : null;
};

const splitToArray = (value: MultiValueInput) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeInlineWhitespace(item))
      .filter((item): item is string => item !== null);
  }

  const normalized = normalizeText(value);
  if (!normalized) return [] as string[];

  return normalized
    .split(/\n|;|,(?=\s)|\u2022|•/g)
    .map((item) => normalizeInlineWhitespace(item.replace(BULLET_PATTERN, '')))
    .filter((item): item is string => item !== null);
};

const appendValue = (current: string | null, next: string | null) => {
  if (!next) return current;
  if (!current) return next;
  return `${current}\n${next}`;
};

const createEmptyParsedAnswerMap = (): ParsedAnswerMap => ({
  trigger_for_call: null,
  expected_solution: null,
  experience_level: null,
  decision_process: null,
  main_obstacle: null,
  attempted_solutions: null,
  duration_of_problem: null,
  ideal_result: null,
  expected_timeline: null,
  impact_if_no_action: null,
  potential_losses: null,
  history_of_delayed_decisions: null,
  seriousness: null,
  decision_stage: null,
});

const parseStructuredRawNotes = (rawNotes: string): ParsedAnswerMap => {
  const parsed = createEmptyParsedAnswerMap();
  const lines = rawNotes.replace(/\r\n/g, '\n').split('\n');
  let currentField: keyof ParsedAnswerMap | null = null;
  let collectingAnswer = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      if (collectingAnswer && currentField) {
        parsed[currentField] = appendValue(parsed[currentField], '\n');
      }
      continue;
    }

    if (SECTION_LINE_PATTERN.test(line)) {
      currentField = null;
      collectingAnswer = false;
      continue;
    }

    const mappedField = QUESTION_TO_FIELD_KEY[line];
    if (mappedField) {
      currentField = mappedField;
      collectingAnswer = false;
      continue;
    }

    if (ANSWER_PREFIX_PATTERN.test(line) && currentField) {
      const answerValue = normalizeText(line.replace(ANSWER_PREFIX_PATTERN, ''));
      if (answerValue) {
        parsed[currentField] = appendValue(parsed[currentField], answerValue);
      }
      collectingAnswer = true;
      continue;
    }

    if (collectingAnswer && currentField) {
      parsed[currentField] = appendValue(parsed[currentField], line);
    }
  }

  return Object.fromEntries(
    FIELD_KEYS.map((key) => [key, normalizeText(parsed[key])])
  ) as ParsedAnswerMap;
};

const detectLanguage = (value: NullableString) => {
  const normalized = normalizeText(value)?.toLowerCase();
  if (!normalized) return null;

  if (/[ăâîșşțţ]/i.test(normalized)) return 'ro';

  const romanianMarkers = [
    ' si ',
    ' să ',
    ' este ',
    ' pentru ',
    ' mai ',
    ' vrea ',
    ' nu ',
    ' cu ',
    ' lui ',
  ];
  if (romanianMarkers.some((marker) => normalized.includes(marker))) return 'ro';

  const englishMarkers = [
    ' the ',
    ' and ',
    ' wants ',
    ' needs ',
    ' with ',
    ' decision ',
    ' problem ',
    ' goal ',
  ];
  if (englishMarkers.some((marker) => normalized.includes(marker))) return 'en';

  return null;
};

const extractStringField = (
  input: RawLeadDiscoveryNotesObject,
  pathValue: NullableString,
  fallbackKey: FlatStringFieldKey
) => normalizeInlineWhitespace(pathValue ?? input[fallbackKey]);

const extractArrayField = (
  input: RawLeadDiscoveryNotesObject,
  pathValue: MultiValueInput,
  fallbackKey: FlatArrayFieldKey
) => splitToArray(pathValue ?? input[fallbackKey]);

const buildPayload = (
  values: ParsedAnswerMap | RawLeadDiscoveryNotesObject,
  explicitLanguage?: string | null
): LeadDiscoveryNotesPayload => {
  const isParsedMap = 'trigger_for_call' in values && !('lead_context' in values);
  const parsedValues = isParsedMap ? (values as ParsedAnswerMap) : null;
  const inputValues = isParsedMap ? null : (values as RawLeadDiscoveryNotesObject);

  const triggerForCall = isParsedMap
    ? normalizeInlineWhitespace(parsedValues?.trigger_for_call)
    : extractStringField(
        inputValues,
        inputValues.lead_context?.desired_outcome?.trigger_for_call,
        'trigger_for_call'
      );
  const expectedSolution = isParsedMap
    ? splitToArray(parsedValues?.expected_solution)
    : extractArrayField(
        inputValues,
        inputValues.lead_context?.desired_outcome?.expected_solution,
        'expected_solution'
      );
  const experienceLevel = isParsedMap
    ? normalizeInlineWhitespace(parsedValues?.experience_level)
    : extractStringField(
        inputValues,
        inputValues.lead_context?.current_situation?.experience_level,
        'experience_level'
      );
  const decisionProcess = isParsedMap
    ? normalizeInlineWhitespace(parsedValues?.decision_process)
    : extractStringField(
        inputValues,
        inputValues.lead_context?.current_situation?.decision_process,
        'decision_process'
      );
  const mainObstacle = isParsedMap
    ? normalizeInlineWhitespace(parsedValues?.main_obstacle)
    : extractStringField(
        inputValues,
        inputValues.lead_context?.problem?.main_obstacle,
        'main_obstacle'
      );
  const attemptedSolutions = isParsedMap
    ? splitToArray(parsedValues?.attempted_solutions)
    : extractArrayField(
        inputValues,
        inputValues.lead_context?.problem?.attempted_solutions,
        'attempted_solutions'
      );
  const durationOfProblem = isParsedMap
    ? normalizeInlineWhitespace(parsedValues?.duration_of_problem)
    : extractStringField(
        inputValues,
        inputValues.lead_context?.problem?.duration_of_problem,
        'duration_of_problem'
      );
  const idealResult = isParsedMap
    ? normalizeInlineWhitespace(parsedValues?.ideal_result)
    : extractStringField(
        inputValues,
        inputValues.lead_context?.goal?.ideal_result,
        'ideal_result'
      );
  const expectedTimeline = isParsedMap
    ? normalizeInlineWhitespace(parsedValues?.expected_timeline)
    : extractStringField(
        inputValues,
        inputValues.lead_context?.goal?.expected_timeline,
        'expected_timeline'
      );
  const impactIfNoAction = isParsedMap
    ? normalizeInlineWhitespace(parsedValues?.impact_if_no_action)
    : extractStringField(
        inputValues,
        inputValues.lead_context?.cost_of_inaction?.impact_if_no_action,
        'impact_if_no_action'
      );
  const potentialLosses = isParsedMap
    ? splitToArray(parsedValues?.potential_losses)
    : extractArrayField(
        inputValues,
        inputValues.lead_context?.cost_of_inaction?.potential_losses,
        'potential_losses'
      );
  const historyOfDelayedDecisions = isParsedMap
    ? normalizeInlineWhitespace(parsedValues?.history_of_delayed_decisions)
    : extractStringField(
        inputValues,
        inputValues.lead_context?.cost_of_inaction?.history_of_delayed_decisions,
        'history_of_delayed_decisions'
      );
  const seriousness = isParsedMap
    ? normalizeInlineWhitespace(parsedValues?.seriousness)
    : extractStringField(
        inputValues,
        inputValues.lead_context?.interest_level?.seriousness,
        'seriousness'
      );
  const decisionStage = isParsedMap
    ? normalizeInlineWhitespace(parsedValues?.decision_stage)
    : extractStringField(
        inputValues,
        inputValues.lead_context?.interest_level?.decision_stage,
        'decision_stage'
      );

  const payload: LeadDiscoveryNotesPayload = {
    lead_context: {
      desired_outcome: {
        trigger_for_call: triggerForCall,
        expected_solution: expectedSolution,
      },
      current_situation: {
        experience_level: experienceLevel,
        decision_process: decisionProcess,
      },
      problem: {
        main_obstacle: mainObstacle,
        attempted_solutions: attemptedSolutions,
        duration_of_problem: durationOfProblem,
      },
      goal: {
        ideal_result: idealResult,
        expected_timeline: expectedTimeline,
      },
      cost_of_inaction: {
        impact_if_no_action: impactIfNoAction,
        potential_losses: potentialLosses,
        history_of_delayed_decisions: historyOfDelayedDecisions,
      },
      interest_level: {
        seriousness,
        decision_stage: decisionStage,
      },
    },
    meta: {
      source: 'frontend_discovery_notes',
      language: explicitLanguage ?? null,
      has_missing_fields: false,
    },
  };

  const missingFields = [
    payload.lead_context.desired_outcome.trigger_for_call,
    payload.lead_context.current_situation.experience_level,
    payload.lead_context.current_situation.decision_process,
    payload.lead_context.problem.main_obstacle,
    payload.lead_context.problem.duration_of_problem,
    payload.lead_context.goal.ideal_result,
    payload.lead_context.goal.expected_timeline,
    payload.lead_context.cost_of_inaction.impact_if_no_action,
    payload.lead_context.cost_of_inaction.history_of_delayed_decisions,
    payload.lead_context.interest_level.seriousness,
    payload.lead_context.interest_level.decision_stage,
  ].some((value) => value === null);

  const missingArrays = [
    payload.lead_context.desired_outcome.expected_solution,
    payload.lead_context.problem.attempted_solutions,
    payload.lead_context.cost_of_inaction.potential_losses,
  ].some((value) => value.length === 0);

  payload.meta.has_missing_fields = missingFields || missingArrays;

  return payload;
};

export const normalizeLeadNotesToPayload = (
  rawNotes: RawLeadDiscoveryNotesInput
): LeadDiscoveryNotesPayload => {
  if (typeof rawNotes === 'string') {
    const normalizedNotes = normalizeText(rawNotes) ?? '';
    const parsed = parseStructuredRawNotes(normalizedNotes);
    return buildPayload(parsed, detectLanguage(normalizedNotes));
  }

  const rawTextForLanguage = [
    rawNotes.raw_notes,
    rawNotes.notes,
    rawNotes.lead_context?.desired_outcome?.trigger_for_call,
    rawNotes.lead_context?.desired_outcome?.expected_solution,
    rawNotes.lead_context?.current_situation?.experience_level,
    rawNotes.lead_context?.current_situation?.decision_process,
    rawNotes.lead_context?.problem?.main_obstacle,
    rawNotes.lead_context?.problem?.attempted_solutions,
    rawNotes.lead_context?.problem?.duration_of_problem,
    rawNotes.lead_context?.goal?.ideal_result,
    rawNotes.lead_context?.goal?.expected_timeline,
    rawNotes.lead_context?.cost_of_inaction?.impact_if_no_action,
    rawNotes.lead_context?.cost_of_inaction?.potential_losses,
    rawNotes.lead_context?.cost_of_inaction?.history_of_delayed_decisions,
    rawNotes.lead_context?.interest_level?.seriousness,
    rawNotes.lead_context?.interest_level?.decision_stage,
    rawNotes.trigger_for_call,
    rawNotes.expected_solution,
    rawNotes.experience_level,
    rawNotes.decision_process,
    rawNotes.main_obstacle,
    rawNotes.attempted_solutions,
    rawNotes.duration_of_problem,
    rawNotes.ideal_result,
    rawNotes.expected_timeline,
    rawNotes.impact_if_no_action,
    rawNotes.potential_losses,
    rawNotes.history_of_delayed_decisions,
    rawNotes.seriousness,
    rawNotes.decision_stage,
  ]
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter((value): value is string => typeof value === 'string')
    .join('\n');

  return buildPayload(
    rawNotes,
    normalizeInlineWhitespace(rawNotes.meta?.language ?? rawNotes.language) ??
      detectLanguage(rawTextForLanguage)
  );
};
