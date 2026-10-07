// types/index.ts
export type Role = "TEAM" | "MANAGER";
export type CSStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type PRStatus = "PENDING" | "IN_PROGRESS" | "APPROVED" | "REJECTED";
// Stage order: CS → PR → PO → MDD → MRD → WCD → PRL → PAR → PDD → COMPLETED
export type CurrentStage = "CS" | "PR" | "PO" | "MDD" | "MRD" | "WCD" | "PRL" | "PAR" | "PDD" | "COMPLETED" | "CANCELLED";
export type SLAStatus = "ON_TRACK" | "AT_RISK" | "OVERDUE" | "COMPLETED";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentId?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  department?: Department | null;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  head?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vendor {
  id: string;
  name: string;
  code: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcurementRequest {
  id: string;
  sourceNo: string;
  /** The original date the requester submitted the source request */
  sourceDate: Date;
  sourceDescription: string;
  /** Date procurement first received/took ownership — may differ from sourceDate by days/weeks after multi-tier approval */
  procurementReceivedDate?: Date | null;
  departmentId: string;
  vendorId?: string | null;
  comparativeDate?: Date | null;
  daysForCS?: number | null;
  csStatus: CSStatus;
  prNumber?: string | null;
  prDate?: Date | null;
  daysForPR?: number | null;
  prStatus: PRStatus;
  poNumber?: string | null;
  poDate?: Date | null;
  daysForPO?: number | null;
  prlNo?: string | null;
  prlDate?: Date | null;
  materialDispatchDate?: Date | null;
  materialReceivedDate?: Date | null;
  workCompletionDate?: Date | null;
  sourceCancellationDate?: Date | null;
  paymentApprovalDate?: Date | null;
  paymentDoneDate?: Date | null;
  currentStatusByHandler?: string | null;
  nameOfHandler?: string | null;
  handlerId?: string | null;
  noOfDays?: number | null;
  currentStage: CurrentStage;
  pendingFrom?: Date | null;
  pendingDays?: number | null;
  slaStatus: SLAStatus;
  slaCS?: number | null;
  slaPR?: number | null;
  slaPO?: number | null;
  slaMDD?: number | null;
  slaMRD?: number | null;
  slaWCD?: number | null;
  slaPRL?: number | null;
  slaPAR?: number | null;
  slaPDD?: number | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  department?: Department;
  vendor?: Vendor | null;
  createdBy?: User;
  handler?: User | null;
}

export interface ActivityLog {
  id: string;
  requestId?: string | null;
  userId: string;
  action: string;
  fieldName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt: Date;
  user?: User;
  request?: ProcurementRequest | null;
}

export interface Notification {
  id: string;
  userId: string;
  requestId?: string | null;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

export interface KPIData {
  total: number;
  pendingCS: number;
  pendingPR: number;
  pendingPO: number;
  pendingDispatch: number;
  completed: number;
  cancelled: number;
  overdue: number;
  avgSLA: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}
