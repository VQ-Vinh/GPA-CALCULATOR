const DEFAULT_SCALE = [
  { from: 0, to: 3.9, letter: 'F', gpa4: 0 },
  { from: 4, to: 4.9, letter: 'D', gpa4: 1 },
  { from: 5, to: 5.4, letter: 'D+', gpa4: 1.5 },
  { from: 5.5, to: 6.4, letter: 'C', gpa4: 2 },
  { from: 6.5, to: 6.9, letter: 'C+', gpa4: 2.5 },
  { from: 7, to: 7.9, letter: 'B', gpa4: 3 },
  { from: 8, to: 8.4, letter: 'B+', gpa4: 3.5 },
  { from: 8.5, to: 9.4, letter: 'A', gpa4: 4 },
  { from: 9.5, to: 10, letter: 'A+', gpa4: 4 },
];

const UNIVERSITY_SCALES = {
  'ĐH Bách Khoa TPHCM (HCMUT)': [
    { from: 9.5, to: 10,   letter: 'A+', gpa4: 4 },
    { from: 8.5, to: 9.4,  letter: 'A',  gpa4: 4 },
    { from: 8.0, to: 8.4,  letter: 'B+', gpa4: 3.5 },
    { from: 7.0, to: 7.9,  letter: 'B',  gpa4: 3 },
    { from: 6.5, to: 6.9,  letter: 'C+', gpa4: 2.5 },
    { from: 5.5, to: 6.4,  letter: 'C',  gpa4: 2 },
    { from: 5.0, to: 5.4,  letter: 'D+', gpa4: 1.5 },
    { from: 4.0, to: 4.9,  letter: 'D',  gpa4: 1 },
    { from: 0,   to: 3.9,  letter: 'F',  gpa4: 0 },
  ],
  'ĐH Công nghiệp TPHCM (IUH)': [
    { from: 9.0, to: 10,   letter: 'A+', gpa4: 4 },
    { from: 8.5, to: 8.9,  letter: 'A',  gpa4: 3.8 },
    { from: 8.0, to: 8.4,  letter: 'B+', gpa4: 3.5 },
    { from: 7.0, to: 7.9,  letter: 'B',  gpa4: 3 },
    { from: 6.0, to: 6.9,  letter: 'C+', gpa4: 2.5 },
    { from: 5.5, to: 5.9,  letter: 'C',  gpa4: 2 },
    { from: 5.0, to: 5.4,  letter: 'D+', gpa4: 1.5 },
    { from: 4.0, to: 4.9,  letter: 'D',  gpa4: 1 },
    { from: 0,   to: 3.9,  letter: 'F',  gpa4: 0 },
  ],
};
