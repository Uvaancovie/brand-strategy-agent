// ─── TYPES ──────────────────────────────────────────────────────────

export type SectionId = 'name' | 'character' | 'intent' | 'voice' | 'creation' | 'operation' | 'image' | 'administration';

export interface FrameworkField {
  id: string;
  label: string;
  description: string;
}

export interface FrameworkSection {
  id: SectionId;
  label: string;
  color: string;
  icon: string;
  fields: FrameworkField[];
}

export interface Extraction {
  section: string;
  field: string;
  value: string;
}

export interface AgentResponse {
  message: string;
  extractions: Extraction[];
}

export interface ChatMessage {
  role: 'user' | 'agent';
  content: string;
  quickActions?: string[];
}

export type BrandScript = Record<SectionId, Record<string, string>>;

// ─── VMV8 FRAMEWORK ────────────────────────────────────────────────

export const FRAMEWORK: FrameworkSection[] = [
  {
    id: 'name', label: 'Name', color: '#FF6B35', icon: '✦',
    fields: [
      { id: 'purpose', label: 'Purpose', description: 'Where the visionary has identified a problem they have a conviction to fix. The solution exists in one of three forms: Physical, Emotional, or Spiritual. Purpose is married to the archetype\'s core desire.' },
      { id: 'origin_story_character', label: 'Origin Story — Character', description: 'What do they want? Defined through Conviction (Benevolence/Heartbreak) and Cause (Anger/The Fight).' },
      { id: 'origin_story_problem', label: 'Origin Story — Problem', description: 'External (tangible obstacle), Internal (emotional toll/frustration), Philosophical/Spiritual (why it\'s fundamentally wrong).' },
      { id: 'origin_story_guide', label: 'Origin Story — Guide', description: 'Empathy (understanding their fear) and Authority/Testimony (what they\'ve seen, heard, experienced).' },
      { id: 'tagline', label: 'Tagline', description: 'The "salt" — distilled to max 3 words. Abstract Name → Clear Tagline, Clear Name → Abstract Tagline.' },
      { id: 'slogan', label: 'Slogan', description: 'A temporary, seasonal advertising hook for campaigns. Must align with brand character and tone.' },
    ],
  },
  {
    id: 'character', label: 'Character', color: '#E86FBF', icon: '♦',
    fields: [
      { id: 'values', label: 'Values', description: 'Core moral principles the business will never compromise on.' },
      { id: 'conviction', label: 'Conviction & Cause', description: 'The benevolence that drives them and the injustice making them angry.' },
      { id: 'charity', label: 'Charity', description: 'How the business expresses character through giving back or supporting aligned causes.' },
    ],
  },
  {
    id: 'intent', label: 'Intent', color: '#7C6BFF', icon: '◈',
    fields: [
      { id: 'vision', label: 'Vision', description: 'The desired end that does not currently exist. If achieved, the business\'s job is done.' },
      { id: 'mission', label: 'Mission', description: 'Need/Problem + Action (sent to carry out what) + Audience (sent to who).' },
      { id: 'message', label: 'Message', description: 'What awaits / is possible — a promise. What the recipient gets out of the mission.' },
    ],
  },
  {
    id: 'voice', label: 'Voice', color: '#4ECDC4', icon: '◉',
    fields: [
      { id: 'archetype', label: 'Archetype', description: 'One of Mark & Pearson\'s 12 brand archetypes (Hero, Creator, Explorer, Sage, etc.).' },
      { id: 'tone', label: 'Tone', description: 'Mapped from Plutchik\'s Emotion Wheel: Joy, Trust, Fear, Surprise, Sadness, Disgust, Anger — each with specific tones.' },
      { id: 'topics_of_authority', label: 'Topics of Authority', description: 'The subjects and domains the brand is qualified to speak about.' },
    ],
  },
  {
    id: 'creation', label: 'Creation', color: '#F7C948', icon: '★',
    fields: [
      { id: 'product', label: 'Product', description: 'The tangible thing(s) the business creates or sells.' },
      { id: 'service', label: 'Service', description: 'The intangible service(s) the business provides.' },
      { id: 'superpower', label: 'Superpower', description: 'The unique differentiator — what makes this brand\'s creation extraordinary.' },
    ],
  },
  {
    id: 'operation', label: 'Operation', color: '#45B7D1', icon: '⚡',
    fields: [
      { id: 'tools', label: 'Tools', description: 'The specific tools and technologies used in operations.' },
      { id: 'processes', label: 'Processes', description: 'The workflows and methodologies the business follows.' },
      { id: 'systems', label: 'Systems', description: 'The integrated systems and platforms that power the business.' },
      { id: 'logistics', label: 'Logistics', description: 'Delivery, fulfilment, and operational logistics.' },
    ],
  },
  {
    id: 'image', label: 'Image', color: '#FF8C61', icon: '◐',
    fields: [
      { id: 'logo', label: 'Logo', description: 'Description or concept of the brand\'s visual mark.' },
      { id: 'fonts', label: 'Fonts', description: 'Typography choices and their rationale.' },
      { id: 'colour_palette', label: 'Colour Palette', description: 'Primary, secondary, and accent colours with emotional reasoning.' },
    ],
  },
  {
    id: 'administration', label: 'Administration', color: '#98D4A6', icon: '▣',
    fields: [
      { id: 'policies', label: 'Policies', description: 'Key business policies.' },
      { id: 'procedures', label: 'Procedures', description: 'Standard operating procedures.' },
      { id: 'legal', label: 'Legal', description: 'Legal structure, trademarks, IP.' },
      { id: 'finance', label: 'Finance', description: 'Revenue model, pricing strategy, financial structure.' },
    ],
  },
];
