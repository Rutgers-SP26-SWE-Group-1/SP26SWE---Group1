export type RutgersEngineeringEntry = {
  id: string;
  kind: 'major' | 'specialization' | 'certificate' | 'program';
  name: string;
  shortName?: string;
  aliases: string[];
  description: string;
  areas: string[];
  notes: string[];
};

const ENGINEERING_KNOWLEDGE: RutgersEngineeringEntry[] = [
  {
    id: 'bme',
    kind: 'major',
    name: 'Biomedical Engineering',
    shortName: 'BME',
    aliases: ['biomedical engineering', 'bme', 'medical engineering', 'bioengineering'],
    description: 'Applies engineering principles to medicine, healthcare, and biological systems.',
    areas: ['medicine', 'biology', 'medical devices', 'biomechanics', 'healthcare technology'],
    notes: [
      'Students often ask about device design, biomechanics, imaging, tissue engineering, and pre-med overlap.',
      'Helpful follow-ups include lab requirements, biology prerequisites, and whether the student prefers research or device-focused work.',
    ],
  },
  {
    id: 'cbe',
    kind: 'major',
    name: 'Chemical and Biochemical Engineering',
    shortName: 'CBE',
    aliases: ['chemical engineering', 'biochemical engineering', 'cbe', 'chem e', 'chemeng'],
    description: 'Focuses on chemical processes, reaction systems, materials, and biotechnology applications.',
    areas: ['chemical processes', 'thermodynamics', 'biotechnology', 'process design', 'materials'],
    notes: [
      'Common questions involve process engineering, biochemical applications, and the math and chemistry load.',
      'It helps to distinguish whether the student is more interested in pharma, energy, materials, or biotech.',
    ],
  },
  {
    id: 'cee',
    kind: 'major',
    name: 'Civil and Environmental Engineering',
    shortName: 'CEE',
    aliases: ['civil engineering', 'environmental engineering', 'cee', 'civil and environmental engineering'],
    description: 'Covers infrastructure, structures, transportation, water resources, and environmental sustainability.',
    areas: ['structures', 'transportation', 'infrastructure', 'water resources', 'sustainability'],
    notes: [
      'Students may be choosing between structural, transportation, geotechnical, and environmental directions.',
      'Good answers often mention public infrastructure, design projects, and sustainability topics.',
    ],
  },
  {
    id: 'ece',
    kind: 'major',
    name: 'Electrical and Computer Engineering',
    shortName: 'ECE',
    aliases: ['electrical engineering', 'computer engineering', 'ece', 'electrical and computer engineering'],
    description: 'Covers electronics, embedded systems, software, robotics, controls, and communication systems.',
    areas: ['electronics', 'software', 'robotics', 'communications', 'embedded systems', 'controls'],
    notes: [
      'Students often compare ECE with computer science or ask about robotics, firmware, circuits, and hardware-software crossover.',
      'Strong answers usually separate hardware-heavy paths from software-heavy paths within ECE.',
    ],
  },
  {
    id: 'ise',
    kind: 'major',
    name: 'Industrial and Systems Engineering',
    shortName: 'ISE',
    aliases: ['industrial engineering', 'systems engineering', 'ise', 'industrial and systems engineering'],
    description: 'Optimizes systems, operations, logistics, production, and decision-making processes.',
    areas: ['operations', 'optimization', 'logistics', 'production systems', 'analytics'],
    notes: [
      'Common themes are supply chain, operations research, manufacturing, and process improvement.',
      'It helps to explain that ISE is less about building physical machines and more about improving systems and workflows.',
    ],
  },
  {
    id: 'mse',
    kind: 'major',
    name: 'Materials Science and Engineering',
    shortName: 'MSE',
    aliases: ['materials science', 'materials engineering', 'mse', 'materials science and engineering'],
    description: 'Studies the structure, properties, processing, and performance of engineering materials.',
    areas: ['materials', 'polymers', 'metals', 'ceramics', 'electronic materials'],
    notes: [
      'Students often ask about nanomaterials, semiconductors, biomaterials, and manufacturing applications.',
      'A useful distinction is whether the student is interested in research, manufacturing, electronics, or biomedical materials.',
    ],
  },
  {
    id: 'meche',
    kind: 'major',
    name: 'Mechanical Engineering',
    shortName: 'MechE',
    aliases: ['mechanical engineering', 'meche', 'mech e', 'mechanical engineer'],
    description: 'Covers robotics, energy systems, thermal sciences, automotive design, and aerospace-related applications.',
    areas: ['robotics', 'energy', 'automotive', 'aerospace', 'mechanics', 'design'],
    notes: [
      'Students often ask about robotics, CAD, thermodynamics, design work, and aerospace pathways.',
      'It helps to mention that aerospace interest is often supported through a concentration rather than a standalone major.',
    ],
  },
  {
    id: 'packaging',
    kind: 'major',
    name: 'Packaging Engineering',
    aliases: ['packaging engineering', 'packaging', 'package engineering'],
    description: 'A multidisciplinary program focused on packaging materials, product design, manufacturing, and supply chain systems.',
    areas: ['materials', 'design', 'supply chain', 'manufacturing', 'product delivery'],
    notes: [
      'Students often underestimate how interdisciplinary this path is across design, materials, manufacturing, and logistics.',
      'Useful follow-ups include consumer products, sustainability, and supply chain interests.',
    ],
  },
  {
    id: 'applied-sciences',
    kind: 'program',
    name: 'Applied Sciences in Engineering',
    aliases: ['applied sciences in engineering', 'applied sciences', 'interdisciplinary engineering'],
    description: 'A flexible interdisciplinary engineering program for students whose goals cross traditional departmental boundaries.',
    areas: ['interdisciplinary study', 'flexible curriculum', 'custom focus', 'engineering applications'],
    notes: [
      'This program is useful for students with goals that do not fit neatly into one traditional engineering department.',
      'Good advising-style answers should ask what combination of interests the student wants to blend.',
    ],
  },
  {
    id: 'aerospace',
    kind: 'specialization',
    name: 'Aerospace Engineering Concentration',
    aliases: ['aerospace engineering', 'aerospace', 'aerospace concentration'],
    description: 'Often pursued as a concentration within Mechanical Engineering with a focus on aerospace systems and applications.',
    areas: ['flight systems', 'aerospace design', 'mechanics', 'propulsion'],
    notes: [
      'When students ask about Aerospace Engineering at Rutgers, it is helpful to explain that it is commonly approached through Mechanical Engineering.',
    ],
  },
  {
    id: 'environmental',
    kind: 'specialization',
    name: 'Environmental Engineering',
    aliases: ['environmental engineering', 'environmental engineer', 'sustainability engineering'],
    description: 'Focuses on sustainability, environmental protection, pollution control, and water or air quality systems.',
    areas: ['sustainability', 'pollution control', 'water systems', 'air quality', 'environmental systems'],
    notes: [
      'Students asking about sustainability and pollution control are often deciding between CEE pathways and environmental-focused study.',
    ],
  },
  {
    id: 'certificates',
    kind: 'certificate',
    name: 'Engineering Certificate Programs',
    aliases: ['certificate programs', 'engineering certificates', 'robotics certificate', 'energy systems certificate', 'aerospace certificate'],
    description: 'Rutgers engineering students can pursue specialized certificates in areas such as Aerospace, Energy Systems, or Robotics.',
    areas: ['aerospace', 'energy systems', 'robotics', 'specialized training'],
    notes: [
      'Certificates are useful for students who want a focused technical credential without changing majors.',
      'Good answers should frame certificates as complements to a primary major rather than replacements for it.',
    ],
  },
];

type RetrievalResult = {
  entry: RutgersEngineeringEntry;
  score: number;
};

function normalize(text: string) {
  return text.toLowerCase();
}

function scoreEntry(entry: RutgersEngineeringEntry, query: string) {
  const normalized = normalize(query);
  let score = 0;

  for (const alias of entry.aliases) {
    if (normalized.includes(alias.toLowerCase())) {
      score += alias.length > 4 ? 6 : 4;
    }
  }

  if (entry.shortName && normalized.includes(entry.shortName.toLowerCase())) {
    score += 5;
  }

  for (const area of entry.areas) {
    if (normalized.includes(area.toLowerCase())) {
      score += 2;
    }
  }

  if (normalized.includes('rutgers') || normalized.includes('engineering')) {
    score += 1;
  }

  return score;
}

export function findRelevantEngineeringTopics(query: string, limit = 3): RutgersEngineeringEntry[] {
  const scored: RetrievalResult[] = ENGINEERING_KNOWLEDGE.map((entry) => ({
    entry,
    score: scoreEntry(entry, query),
  }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((result) => result.entry);
}

export function buildEngineeringKnowledgeContext(query: string) {
  const matches = findRelevantEngineeringTopics(query);

  if (!matches.length) {
    return null;
  }

  const context = matches
    .map((entry) => {
      const shortName = entry.shortName ? ` (${entry.shortName})` : '';
      const notes = entry.notes.map((note) => `- ${note}`).join('\n');
      return [
        `${entry.name}${shortName}: ${entry.description}`,
        `Focus areas: ${entry.areas.join(', ')}.`,
        `Advising notes:\n${notes}`,
      ].join('\n');
    })
    .join('\n\n');

  return {
    matches,
    context,
  };
}

export function buildEngineeringFallbackReply(query: string) {
  const knowledge = buildEngineeringKnowledgeContext(query);

  if (!knowledge) {
    return null;
  }

  const [primary] = knowledge.matches;
  const shortName = primary.shortName ? ` (${primary.shortName})` : '';

  return `${primary.name}${shortName} at Rutgers is a good fit if you are interested in ${primary.areas
    .slice(0, 3)
    .join(', ')}. ${primary.description} If you want, ask about workload, career paths, or how it compares with another Rutgers engineering option.`;
}

export { ENGINEERING_KNOWLEDGE };
