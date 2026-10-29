export type RoleType =
  | 'ADMIN'
  | 'DOCTOR'
  | 'NURSE'
  | 'RECEPTIONIST'
  | 'LAB_TECH'
  | 'PHARMACIST'
  | 'ACCOUNTANT';

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: RoleType;
  jobTitle?: string;
  department?: string;
  tenantId?: string;
}

export interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  age: number;
  gender: string;
  bloodGroup: string;
  contactNumber: string;
  email?: string;
  address?: string;
  wardBed?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  preAuthNumber?: string;
  emergencyContact?: string;
  allergies: string[];
  chronicConditions: string[];
  status: string;
  assignedDoctor?: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  doctorId: string;
  doctorName: string;
  department: string;
  roomNumber: string;
  appointmentDate: string;
  appointmentTime: string;
  status: 'Scheduled' | 'In-Progress' | 'Completed' | 'Cancelled';
  reason?: string;
  priority?: string;
}

export interface MedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  visitDate: string;
  diagnosis: string;
  icdCode?: string;
  treatmentHistory?: string;
  clinicalNotes: string;
}

export interface PrescriptionItem {
  id: string;
  itemId?: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantity: number;
  unitPrice: number;
  status: 'Pending Pharmacy' | 'Dispensed';
}

export interface Prescription {
  id: string;
  recordId?: string | null;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  prescriptionDate: string;
  status: 'Pending' | 'Dispensed';
  items: PrescriptionItem[];
}

export interface LabParameter {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL' | 'BORDERLINE';
}

export interface LaboratoryTest {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  doctorId: string;
  doctorName: string;
  testName: string;
  sampleStatus: 'Requested' | 'Sample Collected' | 'In-Analysis' | 'Completed';
  isStatUrgent: boolean;
  charge: number;
  createdAt: string;
  completedAt?: string | null;
  resultData?: {
    parameters: LabParameter[];
    pathologistNotes?: string;
    verifiedBy?: string;
  } | null;
}

export interface BillItem {
  id: string;
  serviceType: string;
  description: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Payment {
  id: string;
  idempotencyKey: string;
  amountPaid: number;
  paymentMethod: string;
  transactionRef: string;
  paidAt: string;
}

export interface Bill {
  id: string;
  patientId: string;
  patientName: string;
  patientMrn: string;
  accountantId: string;
  accountantName: string;
  invoiceDate: string;
  totalAmount: number;
  discount: number;
  netPayable: number;
  paymentStatus: 'Unpaid' | 'Partially_Paid' | 'Paid';
  items: BillItem[];
  payments: Payment[];
}

export interface PharmacyItem {
  id: string;
  drugCode: string;
  medicineName: string;
  genericName?: string;
  category: string;
  stockQuantity: number;
  reorderLevel: number;
  unitPrice: number;
  expiryDate: string;
  batchNumber: string;
  statusAlert?: string;
}

export interface StaffMember {
  id: string;
  employeeId: string;
  fullName: string;
  role: RoleType;
  department: string;
  jobTitle: string;
  phoneNumber: string;
  attendanceStatus: 'Present' | 'Absent' | 'On_Leave';
  shift: string;
  email: string;
  joiningDate: string;
  specialization?: string;
  roomNumber?: string;
  consultationFee?: number;
}

export interface LeaveRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  recordId: string;
  ipAddress: string;
  timestamp: string;
}
