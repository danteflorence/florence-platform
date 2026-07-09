// ============================================================================
// Seed — the four first-wave employer-direct accounts (CommonSpirit, HCA, Kaiser,
// Tenet) across multiple care settings, plus a spread of IEN candidates that
// exercises every match category. atsProvider values are plausible placeholders;
// integrationStatus is 'manual' for all (native connectors are EARNED after
// security review). Candidate records are the projection synced from
// florence-pathway-agent — here they are seeded directly for a standalone demo.
// ============================================================================
import { store, uid, now } from './db'
import type {
  EmployerAccount, Facility, JobRequisition, FlorenceCandidate, ATSProvider,
  FacilityType, CareSetting,
} from '../shared/types'

async function employer(name: string, atsProvider: ATSProvider): Promise<EmployerAccount> {
  const e: EmployerAccount = {
    id: uid(), name, atsProvider,
    integrationStatus: 'manual', // native connector earned after security review
    defaultBillingModel: 'direct', sourceChannel: 'direct',
    createdAt: now(), updatedAt: now(),
  }
  await store.employers.insert(e)
  return e
}

async function facility(employerId: string, name: string, facilityType: FacilityType, city: string, state: string): Promise<Facility> {
  const f: Facility = { id: uid(), employerId, name, facilityType, city, state, country: 'US', createdAt: now() }
  await store.facilities.insert(f)
  return f
}

async function req(employerId: string, facilityId: string, p: Partial<JobRequisition> & { title: string; setting: CareSetting }): Promise<JobRequisition> {
  const r: JobRequisition = {
    id: uid(), employerId, facilityId, atsProvider: 'manual',
    title: p.title, specialty: p.specialty, setting: p.setting,
    department: p.department, unit: p.unit,
    city: p.city, state: p.state, requiredLicenseState: p.requiredLicenseState ?? p.state,
    requiredCertifications: p.requiredCertifications,
    shift: p.shift ?? 'variable', employmentType: p.employmentType ?? 'full_time',
    openings: p.openings ?? 1, targetStartWindow: p.targetStartWindow,
    atsRequisitionId: p.atsRequisitionId, status: 'open', sourceChannel: 'direct',
    importedAt: now(), lastSyncedAt: now(),
  }
  await store.requisitions.insert(r)
  return r
}

async function candidate(p: Partial<FlorenceCandidate> & { fullName: string; readinessBand: FlorenceCandidate['readinessBand']; nclexStatus: FlorenceCandidate['nclexStatus']; licenseStatus: FlorenceCandidate['licenseStatus'] }): Promise<FlorenceCandidate> {
  const c: FlorenceCandidate = {
    id: uid(), fullName: p.fullName,
    email: p.email, nationality: p.nationality, countryOfEducation: p.countryOfEducation,
    currentCountry: p.currentCountry, arrivalStatus: p.arrivalStatus ?? 'abroad',
    specialtyExperience: p.specialtyExperience ?? [], yearsExperience: p.yearsExperience,
    readinessBand: p.readinessBand, nclexStatus: p.nclexStatus, licenseStatus: p.licenseStatus,
    visaStatus: p.visaStatus ?? 'unknown',
    targetStates: p.targetStates ?? [], expectedStartWindow: p.expectedStartWindow,
    employerShareConsent: p.employerShareConsent ?? 'not_requested',
    humanQaStatus: p.humanQaStatus ?? 'not_started',
    createdAt: now(), updatedAt: now(),
  }
  await store.candidates.insert(c)
  return c
}

export async function seedIfEmpty(): Promise<void> {
  if ((await store.employers.all()).length > 0) return

  // --- Employers (atsProvider = plausible placeholder; status manual) --------
  const commonSpirit = await employer('CommonSpirit Health', 'oracle_taleo')
  const hca = await employer('HCA Healthcare', 'oracle_taleo')
  const kaiser = await employer('Kaiser Permanente', 'workday')
  const tenet = await employer('Tenet Healthcare', 'icims')

  // --- Facilities across settings -------------------------------------------
  const csHospital = await facility(commonSpirit.id, 'CommonSpirit — Phoenix Medical Center', 'hospital', 'Phoenix', 'AZ')
  const csHomeHealth = await facility(commonSpirit.id, 'CommonSpirit — Sacramento Home Health', 'home_health', 'Sacramento', 'CA')
  const hcaHospital = await facility(hca.id, 'HCA — Denver Presbyterian', 'hospital', 'Denver', 'CO')
  const hcaSnf = await facility(hca.id, 'HCA — Houston Post-Acute', 'snf', 'Houston', 'TX')
  const kaiserHospital = await facility(kaiser.id, 'Kaiser — Oakland Medical Center', 'hospital', 'Oakland', 'CA')
  const kaiserClinic = await facility(kaiser.id, 'Kaiser — San Jose Clinic', 'clinic', 'San Jose', 'CA')
  const tenetAsc = await facility(tenet.id, 'Tenet — Detroit Surgery Center', 'asc', 'Detroit', 'MI')
  const tenetDialysis = await facility(tenet.id, 'Tenet — Miami Dialysis', 'dialysis', 'Miami', 'FL')

  // --- Requisitions ----------------------------------------------------------
  await req(commonSpirit.id, csHospital.id, { title: 'Registered Nurse — Med Surg', specialty: 'Med Surg', setting: 'inpatient', city: 'Phoenix', state: 'AZ', shift: 'night', openings: 12, targetStartWindow: 'Q1 2027', atsRequisitionId: 'REQ-CS-1001' })
  await req(commonSpirit.id, csHospital.id, { title: 'Registered Nurse — ICU', specialty: 'ICU', setting: 'inpatient', city: 'Phoenix', state: 'AZ', shift: 'night', openings: 6, targetStartWindow: 'Q2 2027', atsRequisitionId: 'REQ-CS-1002' })
  await req(commonSpirit.id, csHomeHealth.id, { title: 'Home Health RN', specialty: 'Home Health', setting: 'home_health', city: 'Sacramento', state: 'CA', shift: 'day', openings: 4, targetStartWindow: 'Q2 2027', atsRequisitionId: 'REQ-CS-2001' })

  await req(hca.id, hcaHospital.id, { title: 'Registered Nurse — Emergency', specialty: 'Emergency', setting: 'inpatient', city: 'Denver', state: 'CO', shift: 'variable', openings: 8, targetStartWindow: 'Q1 2027', atsRequisitionId: 'REQ-HCA-3001' })
  await req(hca.id, hcaSnf.id, { title: 'SNF Charge Nurse (RN)', specialty: 'Med Surg', setting: 'post_acute', city: 'Houston', state: 'TX', shift: 'day', openings: 5, targetStartWindow: 'Q2 2027', atsRequisitionId: 'REQ-HCA-4001' })

  await req(kaiser.id, kaiserHospital.id, { title: 'Registered Nurse — ICU', specialty: 'ICU', setting: 'inpatient', city: 'Oakland', state: 'CA', shift: 'night', openings: 10, targetStartWindow: 'Q1 2027', atsRequisitionId: 'REQ-KP-5001' })
  await req(kaiser.id, kaiserClinic.id, { title: 'Ambulatory Clinic RN', specialty: 'Ambulatory', setting: 'clinic', city: 'San Jose', state: 'CA', shift: 'day', openings: 3, targetStartWindow: 'Q3 2027', atsRequisitionId: 'REQ-KP-6001' })

  await req(tenet.id, tenetAsc.id, { title: 'Perioperative RN', specialty: 'Periop', setting: 'outpatient', city: 'Detroit', state: 'MI', shift: 'day', openings: 4, targetStartWindow: 'Q2 2027', atsRequisitionId: 'REQ-TEN-7001' })
  await req(tenet.id, tenetDialysis.id, { title: 'Dialysis RN', specialty: 'Dialysis', setting: 'outpatient', city: 'Miami', state: 'FL', shift: 'day', openings: 6, targetStartWindow: 'Q1 2027', atsRequisitionId: 'REQ-TEN-8001' })

  // --- Candidates (spread across every match category) -----------------------
  await candidate({ fullName: 'Maria Santos', email: 'maria.santos@example.com', nationality: 'Philippines', countryOfEducation: 'Philippines', currentCountry: 'US', arrivalStatus: 'arrived', specialtyExperience: ['Med Surg'], yearsExperience: 5, readinessBand: 'green', nclexStatus: 'passed', licenseStatus: 'issued', visaStatus: 'approved', targetStates: ['AZ'], expectedStartWindow: 'Q1 2027', employerShareConsent: 'granted', humanQaStatus: 'approved' })
  await candidate({ fullName: 'John Mwangi', email: 'john.mwangi@example.com', nationality: 'Kenya', countryOfEducation: 'Kenya', currentCountry: 'US', arrivalStatus: 'arrived', specialtyExperience: ['ICU', 'Critical Care'], yearsExperience: 7, readinessBand: 'green', nclexStatus: 'passed', licenseStatus: 'approved', visaStatus: 'approved', targetStates: ['CA'], expectedStartWindow: 'Q1 2027', employerShareConsent: 'granted', humanQaStatus: 'approved' })
  await candidate({ fullName: 'Aanya Patel', email: 'aanya.patel@example.com', nationality: 'India', countryOfEducation: 'India', currentCountry: 'India', arrivalStatus: 'abroad', specialtyExperience: ['Emergency'], yearsExperience: 4, readinessBand: 'yellow', nclexStatus: 'att_issued', licenseStatus: 'endorsement_in_progress', targetStates: ['CO'], expectedStartWindow: 'Q2 2027', employerShareConsent: 'granted', humanQaStatus: 'pending' })
  await candidate({ fullName: 'Grace Okoro', email: 'grace.okoro@example.com', nationality: 'Nigeria', countryOfEducation: 'Nigeria', currentCountry: 'Nigeria', arrivalStatus: 'abroad', specialtyExperience: ['ICU'], yearsExperience: 3, readinessBand: 'yellow', nclexStatus: 'scheduled', licenseStatus: 'submitted', targetStates: ['CA'], expectedStartWindow: 'Q2 2027', employerShareConsent: 'not_requested', humanQaStatus: 'pending' })
  await candidate({ fullName: 'Carlos Reyes', email: 'carlos.reyes@example.com', nationality: 'Mexico', countryOfEducation: 'Mexico', currentCountry: 'Mexico', arrivalStatus: 'abroad', specialtyExperience: ['Med Surg'], yearsExperience: 2, readinessBand: 'orange', nclexStatus: 'registered', licenseStatus: 'not_started', targetStates: ['TX'], expectedStartWindow: 'Q3 2027', employerShareConsent: 'not_requested', humanQaStatus: 'not_started' })
  await candidate({ fullName: 'Linh Tran', email: 'linh.tran@example.com', nationality: 'Vietnam', countryOfEducation: 'Vietnam', currentCountry: 'Vietnam', arrivalStatus: 'abroad', specialtyExperience: ['Home Health'], yearsExperience: 6, readinessBand: 'red', nclexStatus: 'not_started', licenseStatus: 'not_started', targetStates: ['CA'], expectedStartWindow: 'Q4 2027', employerShareConsent: 'not_requested', humanQaStatus: 'not_started' })
  await candidate({ fullName: 'Fatima Al-Sayed', email: 'fatima.alsayed@example.com', nationality: 'Jordan', countryOfEducation: 'Jordan', currentCountry: 'US', arrivalStatus: 'arrived', specialtyExperience: ['Dialysis'], yearsExperience: 8, readinessBand: 'yellow', nclexStatus: 'passed', licenseStatus: 'deficiency', targetStates: ['FL'], expectedStartWindow: 'Q1 2027', employerShareConsent: 'granted', humanQaStatus: 'pending' })

  console.log('[ats-connect] seeded:', await store.counts())
}
