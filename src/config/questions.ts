// ─── FIELD QUESTIONS WITH SMART SUGGESTIONS ─────────────────────────
// Each field has a question, hint, and multiple-choice options

export interface FieldQuestionConfig {
  question: string;
  hint: string;
  options: string[];
  multiSelect?: boolean; // allow selecting multiple chips
  allowCustom?: boolean; // show "Other" text input
}

export const FIELD_QUESTIONS: Record<string, Record<string, FieldQuestionConfig>> = {
  name: {
    purpose: {
      question: `What type of problem does the founder want to solve?`,
      hint: `The founder's deep conviction — the problem they MUST fix.`,
      options: ['Physical problem (tangible, real-world)', 'Emotional problem (how people feel)', 'Spiritual problem (meaning & purpose)', 'A combination of all three'],
      allowCustom: true,
    },
    origin_story_character: {
      question: `What drives the founder at a personal level?`,
      hint: `Conviction = what breaks their heart. Cause = what makes them angry.`,
      options: ['Heartbreak — witnessing suffering or injustice', 'Anger — frustration with broken systems', 'Personal experience — they lived the problem', 'Empathy — deep understanding of others\' pain', 'Legacy — continuing someone else\'s work'],
      multiSelect: true,
      allowCustom: true,
    },
    origin_story_problem: {
      question: `What's the core problem the brand solves?`,
      hint: `Define the External (tangible), Internal (emotional), and Philosophical (why it's wrong) layers.`,
      options: ['Lack of access or affordability', 'Poor quality in the market', 'Confusing or overwhelming options', 'Broken customer experience', 'Underserved community/niche', 'Outdated industry practices'],
      multiSelect: true,
      allowCustom: true,
    },
    origin_story_guide: {
      question: `How does the brand show credibility?`,
      hint: `Empathy (understanding fear) + Authority (testimony, experience, results).`,
      options: ['Years of industry experience', 'Personal testimony / lived it', 'Certifications & qualifications', 'Proven track record / case studies', 'Community trust & word of mouth', 'Published work or media features'],
      multiSelect: true,
      allowCustom: true,
    },
    tagline: {
      question: `What style of tagline fits the brand?`,
      hint: `Rule: Abstract name → Clear tagline. Clear name → Abstract tagline. Max 3 words.`,
      options: ['Action-oriented (e.g. "Just Do It")', 'Benefit-driven (e.g. "Think Different")', 'Emotional (e.g. "Because You\'re Worth It")', 'Question-based (e.g. "Got Milk?")', 'Statement (e.g. "The King of Beers")'],
      allowCustom: true,
    },
    slogan: {
      question: `What's the brand's current campaign focus?`,
      hint: `Slogans are temporary, seasonal hooks that change with campaigns.`,
      options: ['Launch / Grand Opening', 'Seasonal Promotion', 'Brand Awareness', 'Community Building', 'Product Feature Highlight', 'Trust & Authority'],
      allowCustom: true,
    },
  },
  character: {
    values: {
      question: `What values will this brand NEVER compromise on?`,
      hint: `Core moral principles that filter all business decisions.`,
      options: ['Integrity & Honesty', 'Innovation & Creativity', 'Quality & Excellence', 'Community & Service', 'Sustainability & Responsibility', 'Authenticity & Transparency', 'Empowerment & Growth', 'Respect & Inclusivity'],
      multiSelect: true,
      allowCustom: true,
    },
    conviction: {
      question: `What injustice fuels this brand?`,
      hint: `The benevolence driving them + the fight they're waging.`,
      options: ['People deserve better quality', 'The industry is dishonest', 'Access shouldn\'t depend on privilege', 'Small businesses are being ignored', 'Talent is being wasted', 'The customer always gets the short end'],
      allowCustom: true,
    },
    charity: {
      question: `How does the brand give back?`,
      hint: `Aligned to values — how the business expresses character.`,
      options: ['Donates percentage of profits', 'Sponsors community events', 'Free services for those in need', 'Mentorship programs', 'Environmental initiatives', 'Educational workshops', 'Not yet defined'],
      allowCustom: true,
    },
  },
  intent: {
    vision: {
      question: `What's the brand's ultimate dream state?`,
      hint: `The massive goal that doesn't exist yet. If achieved, the brand's job is done.`,
      options: ['Industry transformation', 'Community empowerment', 'Universal access to something', 'Category creation (new market)', 'Cultural shift', 'Economic equality in the space'],
      allowCustom: true,
    },
    mission: {
      question: `What does the brand DO and for WHOM?`,
      hint: `Formula: Need/Problem + Action + Audience.`,
      options: ['Empower small businesses with...', 'Transform the way people...', 'Make [thing] accessible to everyone', 'Deliver world-class [service] to [audience]', 'Bridge the gap between [A] and [B]'],
      allowCustom: true,
    },
    message: {
      question: `What does the audience GET from this brand?`,
      hint: `The promise — what's possible when they engage with the brand.`,
      options: ['Peace of mind', 'Financial freedom / growth', 'Professional transformation', 'Time saved & efficiency', 'Community & belonging', 'Confidence & empowerment', 'Quality they can trust'],
      multiSelect: true,
      allowCustom: true,
    },
  },
  voice: {
    archetype: {
      question: `Which archetype best describes the brand's personality?`,
      hint: `Based on Mark & Pearson's 12 Brand Archetypes.`,
      options: ['🛡️ Hero — Courage, mastery, achievement', '🧙 Magician — Transformation, vision', '👑 Ruler — Control, stability, leadership', '🧑‍🎨 Creator — Innovation, imagination', '🧭 Explorer — Freedom, discovery', '📚 Sage — Wisdom, knowledge, truth', '😄 Jester — Fun, humor, joy', '❤️ Lover — Passion, intimacy, beauty', '🌿 Innocent — Simplicity, optimism', '🤝 Everyman — Belonging, relatability', '🏴‍☠️ Outlaw — Rebellion, disruption', '🫶 Caregiver — Nurturing, protection'],
      allowCustom: true,
    },
    tone: {
      question: `What emotional tone does the brand communicate with?`,
      hint: `Mapped from Plutchik's Emotion Wheel.`,
      options: ['Joyful & Optimistic', 'Trustworthy & Reliable', 'Bold & Fearless', 'Surprising & Exciting', 'Empathetic & Understanding', 'Passionate & Intense', 'Calm & Authoritative', 'playful & Witty'],
      multiSelect: true,
      allowCustom: true,
    },
    topics_of_authority: {
      question: `What subjects is this brand the expert on?`,
      hint: `Domains the brand owns — what they're qualified to speak about.`,
      options: ['Industry best practices', 'Technology & Innovation', 'Design & Aesthetics', 'Business strategy', 'Customer experience', 'Market trends & insights', 'How-to & Education', 'Culture & Community'],
      multiSelect: true,
      allowCustom: true,
    },
  },
  creation: {
    product: {
      question: `What tangible products does the business sell?`,
      hint: `Physical or digital products the customer receives.`,
      options: ['Physical goods', 'Digital products', 'Software / SaaS', 'Content / Media', 'Food & Beverage', 'Fashion & Apparel', 'No physical products — service only'],
      allowCustom: true,
    },
    service: {
      question: `What services does the business provide?`,
      hint: `The intangible value delivered.`,
      options: ['Consulting & Advisory', 'Design & Creative', 'Development & Technical', 'Marketing & Advertising', 'Education & Training', 'Managed services', 'Installation & Maintenance'],
      multiSelect: true,
      allowCustom: true,
    },
    superpower: {
      question: `What makes this brand UNLIKE anything else?`,
      hint: `The impossible-to-copy differentiator.`,
      options: ['Speed — faster than everyone', 'Quality — unmatched standards', 'Price — best value for money', 'Experience — white glove service', 'Innovation — first to market', 'Personality — they make it fun', 'Network — connections & access', 'Expertise — decades of mastery'],
      allowCustom: true,
    },
  },
  operation: {
    tools: {
      question: `What tools and technologies power the business?`,
      hint: `Specific platforms, software, equipment used daily.`,
      options: ['Project management (Trello, Asana, Monday)', 'CRM (HubSpot, Salesforce)', 'Design (Adobe, Figma, Canva)', 'Dev (GitHub, VS Code, AWS)', 'Communication (Slack, Teams, Zoom)', 'Finance (Xero, QuickBooks)', 'Marketing (Mailchimp, Meta Ads)'],
      multiSelect: true,
      allowCustom: true,
    },
    processes: {
      question: `What key workflows does the business follow?`,
      hint: `Repeatable processes from inquiry to delivery.`,
      options: ['Discovery / Consultation call', 'Proposal & Quote', 'Onboarding', 'Production / Fulfilment', 'Quality assurance / Review', 'Delivery & Handoff', 'Follow-up & Feedback'],
      multiSelect: true,
      allowCustom: true,
    },
    systems: {
      question: `What integrated systems power the operation?`,
      hint: `Platforms that are interconnected for automation.`,
      options: ['E-commerce platform', 'Booking / Scheduling system', 'Payment gateway', 'Inventory management', 'Analytics & Reporting', 'Customer support / Helpdesk', 'Automation (Zapier, Make)'],
      multiSelect: true,
      allowCustom: true,
    },
    logistics: {
      question: `How does the brand deliver its products/services?`,
      hint: `Fulfilment, shipping, delivery methods.`,
      options: ['Digital delivery (email, download)', 'In-person / On-site', 'Courier / Shipping', 'Self-service / Platform access', 'Hybrid (digital + physical)', 'White label / Through partners'],
      multiSelect: true,
      allowCustom: true,
    },
  },
  image: {
    logo: {
      question: `What style of logo represents the brand?`,
      hint: `The visual mark — a symbol of everything the brand stands for.`,
      options: ['Wordmark (text only, e.g. Google)', 'Icon/Symbol (e.g. Apple, Nike)', 'Combination mark (icon + text)', 'Emblem (badge style, e.g. Starbucks)', 'Lettermark (initials, e.g. IBM)', 'Abstract mark (geometric, unique shape)'],
      allowCustom: true,
    },
    fonts: {
      question: `What typography style fits the brand?`,
      hint: `Fonts communicate personality before a single word is read.`,
      options: ['Sans-serif — Clean, Modern (e.g. Inter, Helvetica)', 'Serif — Classic, Trustworthy (e.g. Georgia, Playfair)', 'Display — Bold, Attention-grabbing', 'Handwritten — Personal, Creative', 'Monospace — Technical, Developer-oriented', 'Mixed — Primary serif + Secondary sans-serif'],
      allowCustom: true,
    },
    colour_palette: {
      question: `What colour family speaks for the brand?`,
      hint: `Colours trigger emotions and associations.`,
      options: ['🔴 Reds & Oranges — Energy, Passion, Urgency', '🔵 Blues — Trust, Professionalism, Calm', '🟢 Greens — Growth, Health, Nature', '🟣 Purples — Luxury, Creativity, Wisdom', '⚫ Black & Gold — Premium, Authority', '🟡 Yellows & Ambers — Optimism, Warmth', '🩶 Neutrals — Minimalism, Sophistication', 'Multi-colour — Diversity, Playfulness'],
      allowCustom: true,
    },
  },
  administration: {
    policies: {
      question: `What key policies guide the business?`,
      hint: `Rules and standards the business operates under.`,
      options: ['Returns & Refund policy', 'Privacy policy', 'Service level agreement (SLA)', 'Code of conduct', 'Anti-discrimination policy', 'Sustainability policy', 'Not yet defined'],
      multiSelect: true,
      allowCustom: true,
    },
    procedures: {
      question: `What standard procedures are followed?`,
      hint: `SOPs that ensure consistency and quality.`,
      options: ['Client onboarding SOP', 'Quality control checklist', 'Incident response procedure', 'Employee training program', 'Content approval workflow', 'Financial reporting schedule', 'Not yet defined'],
      multiSelect: true,
      allowCustom: true,
    },
    legal: {
      question: `What's the legal structure?`,
      hint: `Business entity, trademarks, intellectual property.`,
      options: ['Sole Proprietor', 'LLC / Ltd Company', 'Partnership', 'Corporation / PTY', 'Nonprofit / NGO', 'Registered trademark(s)', 'Pending registration'],
      multiSelect: true,
      allowCustom: true,
    },
    finance: {
      question: `What's the revenue model?`,
      hint: `How the business makes money.`,
      options: ['Project-based (per job)', 'Retainer / Subscription', 'Product sales', 'Freemium + Premium', 'Commission-based', 'Hourly rate', 'Tiered pricing (packages)', 'Ad-supported / Sponsorship'],
      multiSelect: true,
      allowCustom: true,
    },
  },
};

export function getFieldQuestion(sectionId: string, fieldId: string): FieldQuestionConfig | null {
  return FIELD_QUESTIONS[sectionId]?.[fieldId] || null;
}

export function getSectionQuestions(sectionId: string): Record<string, FieldQuestionConfig> {
  return FIELD_QUESTIONS[sectionId] || {};
}
