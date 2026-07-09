import type { OfficialResource } from './types'

// Grounded F-1 visa interview prep. Sourced from the U.S. Dept. of State student
// visa + 214(b) visa-denials guidance and DHS Study in the States.
export interface InterviewPrep {
  intro: string
  documentsToBring: string[]
  keyConcepts: { title: string; body: string }[]
  commonQuestions: string[]
  resources: OfficialResource[]
}

export const F1_INTERVIEW_PREP: InterviewPrep = {
  intro:
    'A consular officer decides your F-1 visa in a short interview. Bring the right documents and be ready to show — briefly and honestly — three things: that you are a genuine student, that you can pay, and that you intend to return home after your studies.',
  documentsToBring: [
    'Passport (valid — plus any older passports)',
    'DS-160 confirmation page (with barcode)',
    'Visa appointment confirmation',
    'Form I-20 (signed)',
    'I-901 SEVIS fee payment receipt',
    'Visa application (MRV) fee receipt',
    'One recent photo meeting the photo requirements',
    'Proof of funds — ORIGINAL bank statements / scholarship award letters showing funds for the first year and access to funds for the rest of your studies',
    'If sponsored: proof of your relationship to the sponsor + the sponsor’s original tax forms and bank statements',
    'Academic documents — transcripts, diplomas, and test scores (e.g., IELTS / TOEFL / OET)',
    'Evidence of ties to your home country (employment, family, property)',
  ],
  keyConcepts: [
    { title: 'Nonimmigrant intent (INA 214(b))', body: 'The law presumes you intend to immigrate until you prove otherwise. The most common reason F-1 visas are refused is failing to show strong ties to your home country that will compel you to return. Be ready to explain your plan to return home after your program.' },
    { title: 'Ability to pay (proof of funds)', body: 'Show credible, readily-available funds for your first year and access to funds for the rest of your studies. Only original bank statements and scholarship letters are accepted at the interview.' },
    { title: 'Intent to study', body: 'Be able to explain why you chose this school and program, how it fits your career, and what you will do after you graduate — back home.' },
    { title: 'English ability', body: 'The interview is usually in English. Answer clearly and concisely, and bring your English test scores.' },
  ],
  commonQuestions: [
    'Why do you want to study in the United States?',
    'Why did you choose this school and this program?',
    'How will you pay for your studies and living costs?',
    'Who is sponsoring you, and what do they do?',
    'What are your plans after you finish your program?',
    'Do you have family or relatives in the United States?',
    'What ties do you have to your home country?',
  ],
  resources: [
    { label: 'U.S. Dept. of State — Student Visa', url: 'https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html' },
    { label: 'U.S. Dept. of State — Visa Denials (214(b))', url: 'https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/visa-denials.html' },
    { label: 'Study in the States — F-1 Postsecondary', url: 'https://studyinthestates.dhs.gov/guide/f-1/f-1-postsecondary' },
  ],
}
