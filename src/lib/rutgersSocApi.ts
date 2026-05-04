export type RutgersTerm = {
  year: number;
  term: 1 | 7 | 9;
  label: 'Spring' | 'Summer' | 'Fall';
};

export type RutgersSocCourse = {
  code: string;
  title: string;
  sections: RutgersSocSection[];
};

export type RutgersSocSection = {
  section: string;
  instructor: string;
  status: string;
  campus: string;
  meetingTimes: string[];
};

type SocMeeting = {
  campusName?: string;
  meetingDay?: string;
  startTime?: string;
  endTime?: string;
  pmCode?: string;
};

type SocSection = {
  number?: string;
  instructorsText?: string;
  openStatus?: boolean;
  openStatusText?: string;
  campusCode?: string;
  sectionCampusLocations?: Array<{ description?: string }>;
  meetingTimes?: SocMeeting[];
};

type SocCourse = {
  courseString?: string;
  title?: string;
  expandedTitle?: string;
  sections?: SocSection[];
};

const COURSE_CODE_PATTERN = /\b\d{2}\s*:\s*\d{3}\s*:\s*\d{3}\b/g;

const TERM_MAP = {
  spring: { term: 1, label: 'Spring' },
  summer: { term: 7, label: 'Summer' },
  fall: { term: 9, label: 'Fall' },
} as const;

function normalizeCourseCode(code: string) {
  return code.replace(/\s*:\s*/g, ':').trim().toUpperCase();
}

export function extractSocCourseCodes(message: string) {
  return Array.from(message.matchAll(COURSE_CODE_PATTERN)).map((match) =>
    normalizeCourseCode(match[0])
  );
}

export function detectSocTerm(message: string, now = new Date()): RutgersTerm {
  const normalized = message.toLowerCase();
  const explicitYear = normalized.match(/\b(20\d{2})\b/);
  const year = explicitYear ? Number(explicitYear[1]) : now.getFullYear();

  for (const [termName, termData] of Object.entries(TERM_MAP)) {
    if (normalized.includes(termName)) {
      return {
        year,
        term: termData.term,
        label: termData.label,
      };
    }
  }

  const month = now.getMonth() + 1;
  if (month >= 9) return { year, term: 9, label: 'Fall' };
  if (month >= 6) return { year, term: 7, label: 'Summer' };
  return { year, term: 1, label: 'Spring' };
}

function toStandardTime(value?: string, pmCode?: string) {
  if (!value || value.length !== 4) return 'TBA';

  const hours = Number.parseInt(value.slice(0, 2), 10);
  const minutes = value.slice(2);
  const normalizedHours = hours % 12 || 12;
  const suffix = pmCode === 'P' || hours >= 12 ? 'PM' : 'AM';

  return `${normalizedHours}:${minutes} ${suffix}`;
}

function formatMeeting(meeting: SocMeeting) {
  const day = meeting.meetingDay ?? 'Day TBA';
  const start = toStandardTime(meeting.startTime, meeting.pmCode);
  const end = toStandardTime(meeting.endTime, meeting.pmCode);
  const campus = meeting.campusName ? ` at ${meeting.campusName}` : '';
  return `${day} ${start} - ${end}${campus}`;
}

function getCampus(section: SocSection) {
  return (
    section.sectionCampusLocations?.[0]?.description ??
    section.meetingTimes?.[0]?.campusName ??
    section.campusCode ??
    'Campus unavailable'
  );
}

function mapCourse(course: SocCourse): RutgersSocCourse | null {
  if (!course.courseString) return null;

  return {
    code: course.courseString,
    title: course.title ?? course.expandedTitle ?? 'Title unavailable',
    sections: (course.sections ?? []).map((section) => ({
      section: section.number ?? 'Section unavailable',
      instructor: section.instructorsText || 'Instructor unavailable',
      status:
        section.openStatusText ||
        (section.openStatus === true ? 'Open' : section.openStatus === false ? 'Closed' : 'Status unavailable'),
      campus: getCampus(section),
      meetingTimes: (section.meetingTimes ?? []).map(formatMeeting),
    })),
  };
}

export async function fetchRutgersSocCourses(term: RutgersTerm, campus = 'NB') {
  try {
    const url = `https://sis.rutgers.edu/soc/api/courses.json?year=${term.year}&term=${term.term}&campus=${campus}`;
    const response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return [];

    const data = (await response.json()) as SocCourse[];
    return data.map(mapCourse).filter((course): course is RutgersSocCourse => course !== null);
  } catch {
    return [];
  }
}

export function filterSocCourses(courses: RutgersSocCourse[], message: string) {
  const requestedCodes = extractSocCourseCodes(message);

  if (requestedCodes.length > 0) {
    return courses.filter((course) => requestedCodes.includes(course.code));
  }

  const normalized = message.toLowerCase();
  if (normalized.includes('cs') || normalized.includes('computer science')) {
    return courses.filter((course) => course.code.split(':')[1] === '198');
  }

  return courses;
}

export function formatSocContext(courses: RutgersSocCourse[], term: RutgersTerm) {
  return courses
    .slice(0, 12)
    .map((course) => {
      const sections = course.sections.slice(0, 8);
      return [
        `Course: ${course.code} ${course.title}`,
        `Term: ${term.label} ${term.year}`,
        `Sections: ${course.sections.length}`,
        ...sections.flatMap((section) => [
          `Section: ${section.section}`,
          `Instructor: ${section.instructor}`,
          `Status: ${section.status}`,
          `Campus/location: ${section.campus}`,
          `Meeting times: ${section.meetingTimes.length ? section.meetingTimes.join('; ') : 'Time unavailable'}`,
        ]),
      ].join('\n');
    })
    .join('\n\n');
}
