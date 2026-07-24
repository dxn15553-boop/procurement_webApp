import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ProcurementForm } from "@/components/procurement/ProcurementForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

function fmtDateInput(d: Date | null | undefined) {
  if (!d) return "";
  try { return format(d, "yyyy-MM-dd"); } catch { return ""; }
}

export default async function EditRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "MANAGER") redirect("/login");

  const { id } = await params;

  const request = await prisma.procurementRequest.findUnique({
    where: { id },
    include: { vendor: true }
  });
  if (!request) notFound();

  const defaultValues = {
    sourceNo: request.sourceNo,
    sourceDate: fmtDateInput(request.sourceDate),
    sourceDescription: request.sourceDescription,
    departmentId: request.departmentId,
    vendorId: request.vendor?.name ?? undefined,
    comparativeDate: fmtDateInput(request.comparativeDate),
    csStatus: request.csStatus as "PENDING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED",
    prNumber: request.prNumber ?? undefined,
    prDate: fmtDateInput(request.prDate),
    prStatus: request.prStatus as "PENDING" | "IN_PROGRESS" | "APPROVED" | "REJECTED",
    poNumber: request.poNumber ?? undefined,
    poDate: fmtDateInput(request.poDate),
    prlNo: request.prlNo ?? undefined,
    prlDate: fmtDateInput(request.prlDate),
    materialDispatchDate: fmtDateInput(request.materialDispatchDate),
    materialReceivedDate: fmtDateInput(request.materialReceivedDate),
    workCompletionDate: fmtDateInput(request.workCompletionDate),
    sourceCancellationDate: fmtDateInput(request.sourceCancellationDate),
    currentStatusByHandler: request.currentStatusByHandler ?? undefined,
    nameOfHandler: request.nameOfHandler,
    currentStage: request.currentStage as "CS" | "PR" | "PO" | "PAR" | "PDD" | "MDD" | "MRD" | "WCD" | "COMPLETED" | "CANCELLED",
    pendingFrom: fmtDateInput(request.pendingFrom),
  };

  return (
    <div className="space-y-5 fade-in max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href={`/manager/requests/${id}`} className="p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Edit Request — {request.sourceNo}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Modify procurement details and save</p>
        </div>
      </div>
      <ProcurementForm mode="edit" defaultValues={defaultValues} requestId={id} />
    </div>
  );
}
