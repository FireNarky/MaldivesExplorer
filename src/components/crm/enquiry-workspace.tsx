import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addCommunicationForm,
  addNoteForm,
  addTaskForm,
  assignEnquiryForm,
  attachMediaForm,
  changeStatusForm,
  updateTaskForm,
} from "@/modules/crm/actions";
import type { EnquiryDetail } from "@/modules/crm/service";
import { communicationChannels, statusLabel, taskStatuses } from "@/modules/crm/rules";

const controlClass =
  "min-h-11 w-full rounded-sm border border-border bg-white px-4 text-base text-ink";

function needs(detail: EnquiryDetail, status: EnquiryDetail["nextStatuses"][number]): boolean {
  return detail.nextStatuses.includes(status);
}

export function EnquiryWorkspace({ detail }: { detail: EnquiryDetail }) {
  const lossOrClose = needs(detail, "LOST") || needs(detail, "CLOSED");
  return (
    <div className="grid max-w-[65ch] gap-10">
      <section className="grid gap-3">
        <h2>Assignment</h2>
        <p>{detail.assigneeName ?? "Unassigned"}</p>
        {detail.canAssign ? (
          <form action={assignEnquiryForm} className="grid gap-4">
            <input type="hidden" name="reference" value={detail.reference} />
            <input type="hidden" name="revision" value={detail.revision} />
            <div className="grid gap-2">
              <Label htmlFor="assignee">Consultant</Label>
              <select id="assignee" name="userId" className={controlClass} required>
                <option value="">Choose a consultant</option>
                {detail.assignees.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assign-reason">Reason</Label>
              <textarea
                id="assign-reason"
                name="reason"
                className={`${controlClass} min-h-24 py-3`}
                required
              />
            </div>
            <Button type="submit">Assign</Button>
          </form>
        ) : null}
        {detail.assignments.length > 0 ? (
          <ul className="grid gap-2">
            {detail.assignments.map((item) => (
              <li key={item.id}>
                {item.label}. {item.reason}. {item.assignedLabel}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="grid gap-3">
        <h2>Status</h2>
        <p>{detail.statusLabel}</p>
        {detail.canUpdate && detail.nextStatuses.length > 0 ? (
          <form action={changeStatusForm} className="grid gap-4">
            <input type="hidden" name="reference" value={detail.reference} />
            <input type="hidden" name="revision" value={detail.revision} />
            <div className="grid gap-2">
              <Label htmlFor="status">Next status</Label>
              <select id="status" name="status" className={controlClass} required>
                {detail.nextStatuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
              <p>
                Loss uses a loss reason. Closure uses a closure reason. Negotiation uses a follow-up
                date. Quoted uses a sent quote. Won uses an accepted quote and an operational
                reference.
              </p>
            </div>
            {needs(detail, "CONTACT_ATTEMPTED") ? (
              <div className="grid gap-2">
                <Label htmlFor="channel">Channel</Label>
                <select id="channel" name="channel" className={controlClass} defaultValue="PHONE">
                  {communicationChannels.map((channel) => (
                    <option key={channel} value={channel}>
                      {channel}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {needs(detail, "QUALIFIED") ? (
              <label className="flex min-h-11 items-center gap-3" htmlFor="checklist">
                <input id="checklist" name="checklist" type="checkbox" value="yes" />
                The qualification checklist is complete
              </label>
            ) : null}
            {needs(detail, "NEGOTIATION") ? (
              <div className="grid gap-2">
                <Label htmlFor="followUp">Follow-up date, Maldives time</Label>
                <Input id="followUp" name="followUp" type="datetime-local" />
              </div>
            ) : null}
            {needs(detail, "WON") ? (
              <div className="grid gap-2">
                <Label htmlFor="wonReference">Operational reference</Label>
                <Input id="wonReference" name="wonReference" maxLength={80} />
              </div>
            ) : null}
            {lossOrClose ? (
              <div className="grid gap-2">
                <Label htmlFor="reasonCode">Reason</Label>
                <select id="reasonCode" name="reasonCode" className={controlClass} defaultValue="">
                  <option value="">Choose a reason</option>
                  {needs(detail, "LOST")
                    ? detail.lossReasons.map((reason) => (
                        <option key={`loss-${reason.code}`} value={reason.code}>
                          Loss: {reason.label}
                        </option>
                      ))
                    : null}
                  {needs(detail, "CLOSED")
                    ? detail.closureReasons.map((reason) => (
                        <option key={`close-${reason.code}`} value={reason.code}>
                          Closure: {reason.label}
                        </option>
                      ))
                    : null}
                </select>
              </div>
            ) : null}
            <Button type="submit">Update status</Button>
          </form>
        ) : null}
        {detail.canUpdate && detail.nextStatuses.length === 0 ? (
          <p>A person with assignment permission can reopen this enquiry.</p>
        ) : null}
        {detail.statusHistory.length > 0 ? (
          <ul className="grid gap-2">
            {detail.statusHistory.map((item) => (
              <li key={item.id}>
                {item.label}
                {item.reasonCode ? ` · ${item.reasonCode}` : ""} · {item.changedLabel}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="grid gap-3">
        <h2>Tasks</h2>
        {detail.tasks.length === 0 ? <p>No tasks yet.</p> : null}
        <ul className="grid gap-4">
          {detail.tasks.map((task) => (
            <li key={task.id} className="grid gap-2">
              <p>
                {task.title}
                {task.dueLabel ? ` · ${task.dueLabel}` : ""} · {task.assigneeName}
              </p>
              {detail.canUpdate ? (
                <form
                  action={updateTaskForm}
                  className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end"
                >
                  <input type="hidden" name="reference" value={detail.reference} />
                  <input type="hidden" name="taskId" value={task.id} />
                  <div className="grid gap-2">
                    <Label htmlFor={`task-${task.id}`}>Task status</Label>
                    <select
                      id={`task-${task.id}`}
                      name="status"
                      className={controlClass}
                      defaultValue={task.status}
                    >
                      {taskStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button type="submit" variant="secondary">
                    Save task
                  </Button>
                </form>
              ) : (
                <p>{task.status}</p>
              )}
            </li>
          ))}
        </ul>
        {detail.canUpdate ? (
          <form action={addTaskForm} className="grid gap-4">
            <input type="hidden" name="reference" value={detail.reference} />
            <div className="grid gap-2">
              <Label htmlFor="task-title">New task</Label>
              <Input id="task-title" name="title" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-due">Due date, Maldives time</Label>
              <Input id="task-due" name="dueAt" type="datetime-local" />
            </div>
            <Button type="submit" variant="secondary">
              Add task
            </Button>
          </form>
        ) : null}
      </section>

      <section className="grid gap-3">
        <h2>Internal notes</h2>
        <p>Notes marked for the customer appear in the customer thread.</p>
        <ul className="grid gap-3">
          {detail.notes.map((note) => (
            <li key={note.id}>
              <p className="font-semibold">
                {note.visibility === "INTERNAL" ? "Internal" : "Customer"}
              </p>
              <p>{note.body}</p>
              <p>
                {note.authorName} · {note.createdLabel}
              </p>
            </li>
          ))}
        </ul>
        {detail.canUpdate ? (
          <form action={addNoteForm} className="grid gap-4">
            <input type="hidden" name="reference" value={detail.reference} />
            <fieldset className="grid gap-2">
              <legend className="font-semibold">Visibility</legend>
              <label className="flex min-h-11 items-center gap-3" htmlFor="visibility-internal">
                <input
                  id="visibility-internal"
                  type="radio"
                  name="visibility"
                  value="INTERNAL"
                  defaultChecked
                />
                Internal
              </label>
              <label className="flex min-h-11 items-center gap-3" htmlFor="visibility-customer">
                <input id="visibility-customer" type="radio" name="visibility" value="CUSTOMER" />
                Customer
              </label>
            </fieldset>
            <div className="grid gap-2">
              <Label htmlFor="note-body">Note</Label>
              <textarea
                id="note-body"
                name="body"
                className={`${controlClass} min-h-24 py-3`}
                required
              />
            </div>
            <Button type="submit" variant="secondary">
              Add note
            </Button>
          </form>
        ) : null}
      </section>

      <section className="grid gap-3">
        <h2>Communication log</h2>
        <ul className="grid gap-3">
          {detail.communications.map((entry) => (
            <li key={entry.id}>
              <p className="font-semibold">
                {entry.channel} · {entry.direction}
              </p>
              {entry.subject ? <p>{entry.subject}</p> : null}
              <p>{entry.summary}</p>
              <p>{entry.occurredLabel}</p>
            </li>
          ))}
        </ul>
        {detail.canUpdate ? (
          <form action={addCommunicationForm} className="grid gap-4">
            <input type="hidden" name="reference" value={detail.reference} />
            <div className="grid gap-2">
              <Label htmlFor="comm-channel">Channel</Label>
              <select
                id="comm-channel"
                name="channel"
                className={controlClass}
                defaultValue="PHONE"
              >
                {communicationChannels.map((channel) => (
                  <option key={channel} value={channel}>
                    {channel}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="comm-direction">Direction</Label>
              <select
                id="comm-direction"
                name="direction"
                className={controlClass}
                defaultValue="OUTBOUND"
              >
                <option value="OUTBOUND">Outbound</option>
                <option value="INBOUND">Inbound</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="comm-subject">Subject</Label>
              <Input id="comm-subject" name="subject" maxLength={200} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="comm-summary">Summary</Label>
              <textarea
                id="comm-summary"
                name="summary"
                className={`${controlClass} min-h-24 py-3`}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="comm-time">Time, Maldives time</Label>
              <Input id="comm-time" name="occurredAt" type="datetime-local" />
            </div>
            <Button type="submit" variant="secondary">
              Add communication
            </Button>
          </form>
        ) : null}
      </section>

      <section className="grid gap-3">
        <h2>Attachments</h2>
        {detail.attachments.length === 0 ? <p>No attachments yet.</p> : null}
        <ul className="grid gap-2">
          {detail.attachments.map((item) => (
            <li key={item.id}>{item.label}</li>
          ))}
        </ul>
        {detail.canAttach ? (
          <form action={attachMediaForm} className="grid gap-4">
            <input type="hidden" name="reference" value={detail.reference} />
            <div className="grid gap-2">
              <Label htmlFor="mediaId">Existing media id</Label>
              <Input id="mediaId" name="mediaId" required />
            </div>
            <Button type="submit" variant="secondary">
              Attach media
            </Button>
          </form>
        ) : null}
      </section>
    </div>
  );
}
