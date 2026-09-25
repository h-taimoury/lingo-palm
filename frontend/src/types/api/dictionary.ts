export type Pronunciation = {
  text?: string | null;
  br_audio?: string | null;
  am_audio?: string | null;
};

export type EntrySummary = {
  level?: { tooltip: string; indicator: string } | null;
  id: number;
  word: string;
  part_of_speech: string;
  inflections?: string | null;
  homonym_num?: number | null;
  register?: string | null;
  pronunciation: Pronunciation | null;
};

export type SenseSummary = {
  id: number;
  title: string;
  sense_number: number | null;
  definition: string;
  entry: EntrySummary;
};

export type SenseExample = {
  text: string;
  usage: string | null;
};

export type Sense = SenseSummary & {
  lex_unit: string | null;
  geo: string | null;
  register: string | null;
  synonyms: string[];
  opposites: string[];
  examples: SenseExample[];
};

export type Entry = EntrySummary & {
  frequency: string[];
  inflections: string | null;
  register: string | null;
  created_at: string;
  senses: Sense[];
};

export type CreateEntryRequest = {
  level?: { tooltip: string; indicator: string } | null;
  word: string;
  part_of_speech: string;
  pronunciation?: Pronunciation | null;
  frequency?: string[];
  inflections?: string | null;
  register?: string | null;
};

export type UpdateEntryRequest = Partial<
  Omit<CreateEntryRequest, "pronunciation">
>;

export type CreateSenseRequest = {
  entry_id: number;
  sense_number?: number | null;
  title: string;
  definition: string;
  lex_unit?: string | null;
  geo?: string | null;
  register?: string | null;
  synonyms?: string[];
  opposites?: string[];
  examples?: SenseExample[];
};

export type UpdateSenseRequest = Partial<CreateSenseRequest>;
