export type RutgersCourse = {
  code: string;
  title: string;
  school?: string;
  credits?: string;
  description: string;
  whoShouldTake: string;
  difficulty: string;
  sequenceFit?: string;
  nextCourses?: string[];
  recommendation?: string;
};

export const RUTGERS_COURSES: RutgersCourse[] = [
  {
    code: '01:198:110',
    title: 'Principles of Computer Science',
    school: 'School of Arts and Sciences',
    description:
      'An introductory computer science course focused on problem solving and basic programming concepts.',
    whoShouldTake:
      'Students with little or no programming experience who want a first look at computer science.',
    difficulty: 'Beginner',
    sequenceFit: 'This is an early introductory course.',
    nextCourses: ['01:198:111'],
    recommendation:
      'Take it if you want a gentler entry point before the main introductory CS sequence.',
  },
  {
    code: '01:198:111',
    title: 'Introduction to Computer Science',
    school: 'School of Arts and Sciences',
    description:
      'A foundational programming course for students beginning the Computer Science sequence.',
    whoShouldTake:
      'Students planning to continue in Computer Science or students who want a stronger programming foundation.',
    difficulty: 'Beginner to intermediate',
    sequenceFit: 'This is a foundation course in the Computer Science sequence.',
    nextCourses: ['01:198:112'],
    recommendation:
      'Take it when you are ready to commit to the CS sequence and practice programming regularly.',
  },
  {
    code: '01:198:112',
    title: 'Data Structures',
    school: 'School of Arts and Sciences',
    description:
      'A core Computer Science course about organizing data and solving problems efficiently.',
    whoShouldTake:
      'Students who completed introductory programming and are continuing toward the CS major or minor.',
    difficulty: 'Intermediate',
    sequenceFit: 'This course is part of the core Computer Science sequence.',
    recommendation:
      'Take it when your programming basics are solid and you can spend consistent time on assignments.',
  },
  {
    code: '01:198:205',
    title: 'Introduction to Discrete Structures I',
    school: 'School of Arts and Sciences',
    description:
      'A math-focused CS course covering discrete reasoning used in algorithms and theoretical computer science.',
    whoShouldTake:
      'Students continuing in CS who need the mathematical foundation for later theory and algorithms courses.',
    difficulty: 'Intermediate',
    sequenceFit: 'This belongs early in the CS core.',
    recommendation:
      'Take it once you are ready for proof-style reasoning and abstract problem solving.',
  },
];
