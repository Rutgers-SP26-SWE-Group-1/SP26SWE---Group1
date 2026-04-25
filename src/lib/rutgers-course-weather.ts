import { RUTGERS_COURSES, type RutgersCourse } from '@/data/rutgersCourses';
import { RUTGERS_CS_CURRICULUM } from '@/data/rutgersCurriculum';

type TakenCourse = {
  code: string;
  title?: string;
};

const COURSE_CODE_PATTERN = /\b\d{2}\s*:\s*\d{3}\s*:\s*\d{3}\b/g;

function normalizeMessage(message: string) {
  return message.trim().toLowerCase();
}

function normalizeCourseCode(code: string) {
  return code.replace(/\s*:\s*/g, ':').trim().toUpperCase();
}

export function extractRutgersCourseCodes(message: string) {
  return Array.from(message.matchAll(COURSE_CODE_PATTERN)).map((match) =>
    normalizeCourseCode(match[0])
  );
}

function findLocalCourse(code: string) {
  const normalizedCode = normalizeCourseCode(code);
  return RUTGERS_COURSES.find((course) => course.code === normalizedCode) ?? null;
}

export function getLocalRutgersCoursesForQuestion(message: string) {
  const requestedCodes = extractRutgersCourseCodes(message);

  if (requestedCodes.length === 0) {
    return null;
  }

  const courses = requestedCodes.map(findLocalCourse);
  const missingCodes = requestedCodes.filter((_, index) => courses[index] === null);

  return {
    requestedCodes,
    missingCodes,
    courses: courses.filter((course): course is RutgersCourse => course !== null),
  };
}

function isCourseQuestion(message: string) {
  const normalized = normalizeMessage(message);
  return (
    extractRutgersCourseCodes(message).length > 0 ||
    normalized.includes('rutgers course') ||
    normalized.includes('cs course') ||
    normalized.includes('computer science course')
  );
}

export function extractRutgersTakenCourses(message: string): TakenCourse[] {
  const normalized = normalizeMessage(message);
  const hasCompletedLanguage =
    normalized.includes('took') ||
    normalized.includes('taken') ||
    normalized.includes('completed') ||
    normalized.includes('finished') ||
    normalized.includes('passed');

  if (!hasCompletedLanguage) {
    return [];
  }

  return extractRutgersCourseCodes(message).map((code) => ({ code }));
}

export function getRutgersLoadingState(message: string) {
  if (detectScheduleIntent(message)) {
    return {
      title: 'Checking Rutgers Schedule of Classes...',
      detail: 'Using SOC data for sections, instructors, times, and availability.',
    };
  }

  if (!isCourseQuestion(message) && !detectRutgersSchedulePlanningRequest(message)) {
    return null;
  }

  return {
    title: 'Checking local Rutgers data...',
    detail: 'Using verified local course and curriculum records.',
  };
}

export function detectRutgersSchedulePlanningRequest(message: string) {
  const normalized = normalizeMessage(message);
  return (
    normalized.includes('schedule') ||
    normalized.includes('plan my classes') ||
    normalized.includes('plan courses') ||
    normalized.includes('what should i take') ||
    normalized.includes('next semester')
  );
}

export function detectScheduleIntent(message: string) {
  const normalized = normalizeMessage(message);
  return (
    normalized.includes('who teaches') ||
    normalized.includes('instructor') ||
    normalized.includes('professor') ||
    normalized.includes('teaching') ||
    normalized.includes('this semester') ||
    normalized.includes('fall') ||
    normalized.includes('spring') ||
    normalized.includes('summer') ||
    normalized.includes('section') ||
    normalized.includes('time') ||
    normalized.includes('availability') ||
    normalized.includes('open') ||
    normalized.includes('closed')
  );
}

function formatCourse(course: RutgersCourse) {
  return [
    `Course: ${course.code} ${course.title}`,
    `What it is: ${course.description}`,
    `Who should take it: ${course.whoShouldTake}`,
    `Difficulty: ${course.difficulty}`,
    course.sequenceFit ? `Where it fits: ${course.sequenceFit}` : '',
    course.nextCourses?.length ? `Defined next course: ${course.nextCourses.join(', ')}` : '',
    course.recommendation ? `Recommendation: ${course.recommendation}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function formatVerifiedCourseFacts(courses: RutgersCourse[]) {
  return [
    'Verified facts:',
    ...courses.flatMap((course) => [
      `Course code: ${course.code}`,
      `Title: ${course.title}`,
      course.school ? `School: ${course.school}` : '',
      course.credits ? `Credits: ${course.credits}` : '',
      course.nextCourses?.length ? `Verified next course: ${course.nextCourses.join(', ')}` : '',
      '',
    ]),
  ]
    .filter((line) => line !== '')
    .join('\n')
    .trim();
}

export function formatCourseContextForModel(courses: RutgersCourse[]) {
  return courses
    .map((course) =>
      [
        `Course code: ${course.code}`,
        `Title: ${course.title}`,
        course.school ? `School: ${course.school}` : '',
        course.credits ? `Credits: ${course.credits}` : '',
        `Description: ${course.description}`,
        `Who should take it: ${course.whoShouldTake}`,
        `Difficulty: ${course.difficulty}`,
        course.sequenceFit ? `Sequence fit: ${course.sequenceFit}` : '',
        course.nextCourses?.length ? `Verified next courses: ${course.nextCourses.join(', ')}` : '',
        course.recommendation ? `Recommendation note: ${course.recommendation}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    )
    .join('\n\n');
}

function formatCourseComparison(courses: RutgersCourse[]) {
  if (courses.length === 0) {
    return 'I do not have verified data for that course yet.';
  }

  return [
    'Course comparison:',
    ...courses.flatMap((course) => [
      '',
      `${course.code} ${course.title}`,
      `Difficulty: ${course.difficulty}`,
      `Best fit: ${course.whoShouldTake}`,
      course.sequenceFit ? `Sequence: ${course.sequenceFit}` : '',
      course.nextCourses?.length ? `Defined next course: ${course.nextCourses.join(', ')}` : '',
    ]),
  ].join('\n');
}

export function answerLocalRutgersCourseQuestion(message: string) {
  const requestedCodes = extractRutgersCourseCodes(message);

  if (requestedCodes.length === 0) {
    return null;
  }

  const courses = requestedCodes.map(findLocalCourse);

  if (courses.some((course) => course === null)) {
    return 'I do not have verified data for that course yet.';
  }

  const verifiedCourses = courses.filter((course): course is RutgersCourse => course !== null);

  if (verifiedCourses.length > 1) {
    return formatCourseComparison(verifiedCourses);
  }

  return formatCourse(verifiedCourses[0]);
}

export function answerLocalRutgersCurriculumQuestion(message: string, takenCourses: TakenCourse[] = []) {
  const normalized = normalizeMessage(message);
  const isCurriculumQuestion =
    normalized.includes('curriculum') ||
    normalized.includes('degree') ||
    normalized.includes('requirement') ||
    normalized.includes('requirements') ||
    normalized.includes('required courses') ||
    normalized.includes('need to take');

  if (!isCurriculumQuestion) {
    return null;
  }

  const takenCodes = new Set(takenCourses.map((course) => normalizeCourseCode(course.code)));
  const remaining = RUTGERS_CS_CURRICULUM.filter((item) => !takenCodes.has(item.code));

  return [
    'Rutgers CS curriculum guide:',
    'This is a local verified planning dataset. Confirm your official requirements with Degree Navigator or an academic advisor.',
    '',
    'Still to plan:',
    ...remaining.map((item) => `${item.code} ${item.title} - ${item.area}`),
  ].join('\n');
}

export async function handleRutgersSchedulePlanningRequest(
  message: string,
  takenCourses: TakenCourse[] = []
) {
  const curriculumAnswer = answerLocalRutgersCurriculumQuestion(message, takenCourses);

  if (curriculumAnswer) {
    return curriculumAnswer;
  }

  const requestedCodes = extractRutgersCourseCodes(message);

  if (requestedCodes.length > 0) {
    return answerLocalRutgersCourseQuestion(message);
  }

  return [
    'I can help plan from the local Rutgers curriculum dataset.',
    'Tell me which verified course codes you have completed, such as 01:198:111 and 01:198:112.',
  ].join('\n');
}

export async function handleRutgersCourseWeatherRequest(message: string) {
  return {
    courseResults: [],
    weatherResult: null,
    courseError: null,
    weatherError: null,
    formatted:
      answerLocalRutgersCourseQuestion(message) ??
      'I do not have verified data for that course yet.',
  };
}
