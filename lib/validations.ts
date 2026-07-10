import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const procurementSchema = z.object({
  sourceNo: z.string().min(1, "Source number is required"),
  sourceDate: z.string().min(1, "Source date is required"),
  sourceDescription: z.string().min(1, "Description is required"),
  departmentId: z.string().min(1, "Department is required"),
  vendorId: z.string().optional().nullable(),
  comparativeDate: z.string().optional().nullable(),
  csStatus: z.string().optional().nullable(),
  prNumber: z.string().optional().nullable(),
  prDate: z.string().optional().nullable(),
  prStatus: z.string().optional().nullable(),
  poNumber: z.string().optional().nullable(),
  poDate: z.string().optional().nullable(),
  prlNo: z.string().optional().nullable(),
  prlDate: z.string().optional().nullable(),
  materialDispatchDate: z.string().optional().nullable(),
  materialReceivedDate: z.string().optional().nullable(),
  workCompletionDate: z.string().optional().nullable(),
  sourceCancellationDate: z.string().optional().nullable(),
  paymentApprovalDate: z.string().optional().nullable(),
  paymentDoneDate: z.string().optional().nullable(),
  currentStatusByHandler: z.string().optional().nullable(),
  nameOfHandler: z.string().min(1, "Handler name is required"),
  currentStage: z.string().optional().nullable(),
  pendingFrom: z.string().optional().nullable(),
  slaCS: z.number().optional().nullable(),
  slaPR: z.number().optional().nullable(),
  slaPO: z.number().optional().nullable(),
  slaPAR: z.number().optional().nullable(),
  slaPDD: z.number().optional().nullable(),
  slaMDD: z.number().optional().nullable(),
  slaMRD: z.number().optional().nullable(),
  slaWCD: z.number().optional().nullable(),
});

export const departmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  head: z.string().optional().nullable(),
});

export const vendorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  contactPerson: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
});

export const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  role: z.enum(["TEAM", "MANAGER"]),
  departmentId: z.string().optional().nullable(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ProcurementInput = z.infer<typeof procurementSchema>;
export type DepartmentInput = z.infer<typeof departmentSchema>;
export type VendorInput = z.infer<typeof vendorSchema>;
export type UserInput = z.infer<typeof userSchema>;
