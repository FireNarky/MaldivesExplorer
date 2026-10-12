"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isNextRedirect } from "@/lib/http/navigation";
import {
  CrmError,
  addCommunication,
  addNote,
  addTask,
  assignEnquiry,
  attachMedia,
  changeStatus,
  deleteQueueView,
  saveQueueView,
  updateTask,
} from "@/modules/crm/service";
import { parseQueueFilters, queuePath, type AssignmentFilter } from "@/modules/crm/rules";

async function staffId(): Promise<string> {
  const session = await auth().catch(() => null);
  const id = session?.user?.id || "";
  if (!id || !session?.user?.staff) redirect("/login");
  return id;
}

function text(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}

function fail(path: string, error: unknown): never {
  if (isNextRedirect(error)) throw error;
  const message = error instanceof CrmError ? error.message : "The enquiry could not be saved.";
  const join = path.includes("?") ? "&" : "?";
  redirect(`${path}${join}error=${encodeURIComponent(message)}`);
}

export async function assignEnquiryForm(formData: FormData): Promise<void> {
  const id = await staffId();
  const reference = text(formData, "reference");
  try {
    await assignEnquiry(
      id,
      { reference },
      {
        userId: text(formData, "userId"),
        reason: text(formData, "reason"),
        revision: Number(text(formData, "revision")),
      },
    );
  } catch (error) {
    fail(`/admin/enquiries/${reference}`, error);
  }
  redirect(`/admin/enquiries/${reference}?notice=assigned`);
}

export async function changeStatusForm(formData: FormData): Promise<void> {
  const id = await staffId();
  const reference = text(formData, "reference");
  try {
    await changeStatus(
      id,
      { reference },
      {
        status: text(formData, "status"),
        revision: Number(text(formData, "revision")),
        reasonCode: text(formData, "reasonCode"),
        wonReference: text(formData, "wonReference"),
        followUp: text(formData, "followUp"),
        checklist: formData.get("checklist") === "yes",
        channel: text(formData, "channel"),
      },
    );
  } catch (error) {
    fail(`/admin/enquiries/${reference}`, error);
  }
  redirect(`/admin/enquiries/${reference}?notice=status`);
}

export async function addTaskForm(formData: FormData): Promise<void> {
  const id = await staffId();
  const reference = text(formData, "reference");
  try {
    await addTask(id, reference, {
      title: text(formData, "title"),
      dueAt: text(formData, "dueAt"),
    });
  } catch (error) {
    fail(`/admin/enquiries/${reference}`, error);
  }
  redirect(`/admin/enquiries/${reference}?notice=task`);
}

export async function updateTaskForm(formData: FormData): Promise<void> {
  const id = await staffId();
  const reference = text(formData, "reference");
  try {
    await updateTask(id, reference, text(formData, "taskId"), text(formData, "status"));
  } catch (error) {
    fail(`/admin/enquiries/${reference}`, error);
  }
  redirect(`/admin/enquiries/${reference}?notice=task`);
}

export async function addNoteForm(formData: FormData): Promise<void> {
  const id = await staffId();
  const reference = text(formData, "reference");
  try {
    await addNote(id, reference, {
      body: text(formData, "body"),
      visibility: text(formData, "visibility"),
    });
  } catch (error) {
    fail(`/admin/enquiries/${reference}`, error);
  }
  redirect(`/admin/enquiries/${reference}?notice=note`);
}

export async function addCommunicationForm(formData: FormData): Promise<void> {
  const id = await staffId();
  const reference = text(formData, "reference");
  try {
    await addCommunication(id, reference, {
      channel: text(formData, "channel"),
      direction: text(formData, "direction"),
      summary: text(formData, "summary"),
      subject: text(formData, "subject"),
      occurredAt: text(formData, "occurredAt"),
    });
  } catch (error) {
    fail(`/admin/enquiries/${reference}`, error);
  }
  redirect(`/admin/enquiries/${reference}?notice=communication`);
}

export async function attachMediaForm(formData: FormData): Promise<void> {
  const id = await staffId();
  const reference = text(formData, "reference");
  try {
    await attachMedia(id, reference, text(formData, "mediaId").trim());
  } catch (error) {
    fail(`/admin/enquiries/${reference}`, error);
  }
  redirect(`/admin/enquiries/${reference}?notice=attachment`);
}

export async function saveQueueViewForm(formData: FormData): Promise<void> {
  const id = await staffId();
  const filters = parseQueueFilters({
    q: text(formData, "q"),
    status: text(formData, "status"),
    assignment: text(formData, "assignment"),
    page: "1",
  });
  try {
    await saveQueueView(id, {
      name: text(formData, "name"),
      q: filters.q,
      status: filters.status,
      assignment: filters.assignment satisfies AssignmentFilter,
    });
  } catch (error) {
    fail(queuePath(filters), error);
  }
  redirect(queuePath(filters, { notice: "view" }));
}

export async function deleteQueueViewForm(formData: FormData): Promise<void> {
  const id = await staffId();
  const filters = parseQueueFilters({
    q: text(formData, "q"),
    status: text(formData, "status"),
    assignment: text(formData, "assignment"),
  });
  try {
    await deleteQueueView(id, text(formData, "name"));
  } catch (error) {
    fail(queuePath(filters), error);
  }
  redirect(queuePath(filters));
}
