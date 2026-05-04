export type RutgersCurriculumItem = {
  code: string;
  title: string;
  area: string;
};

export const RUTGERS_CS_CURRICULUM: RutgersCurriculumItem[] = [
  { code: '01:198:111', title: 'Introduction to Computer Science', area: 'Computer Science foundation' },
  { code: '01:198:112', title: 'Data Structures', area: 'Computer Science foundation' },
  { code: '01:198:205', title: 'Introduction to Discrete Structures I', area: 'Computer Science foundation' },
  { code: '01:198:206', title: 'Introduction to Discrete Structures II', area: 'Computer Science foundation' },
  { code: '01:198:211', title: 'Computer Architecture', area: 'Computer Science core' },
  { code: '01:198:344', title: 'Design and Analysis of Computer Algorithms', area: 'Computer Science core' },
  { code: '01:640:151', title: 'Calculus I', area: 'Mathematics' },
  { code: '01:640:152', title: 'Calculus II', area: 'Mathematics' },
  { code: '01:640:250', title: 'Introductory Linear Algebra', area: 'Mathematics' },
];
