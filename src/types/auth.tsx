export type StaffRole = 'admin' | 'manager' | 'dispenser' | 'retail assistant' | 'pharmacist';

export interface StaffMember {
  id: string;
  staffCode: string; // e.g., "101", "MARY"
  name: string;
  pin: string;
  role: StaffRole;
  pinHash: string; // Hashed or simple PIN string
  canAccessDispensary: boolean;
  canAccessCounter: boolean;
}

export interface AuthState {
  firebaseUser: any | null; // Firebase User instance
  isSystemAuthenticated: boolean; // Tier 1: Passed Firebase Auth
  currentStaff: StaffMember | null; // Tier 2: Selected active staff
}