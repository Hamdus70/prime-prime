export interface Patient {
  id: string;
  profile_id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  created_at: string;
}

export interface VitalSigns {
  temp?: number;
  bp_sys?: number;
  bp_dia?: number;
  spo2?: number;
  glucose?: number;
  heart_rate?: number;
}

export interface DocumentationLog {
  id: string;
  patient_id: string;
  log_type: 'vital_signs' | 'doctor_advice' | 'clinical_note' | 'prescription';
  content: any;
  created_at: string;
}
