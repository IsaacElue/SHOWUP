/** Shared copy for SMS and email reminders (same core message). */

export function reminderMessage(clientName: string, appointmentAtIso: string) {
  const when = new Date(appointmentAtIso).toLocaleString("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return `Hi ${clientName}, reminder for your appointment on ${when}. Reply Y to confirm or N to cancel.`;
}

export function reminderEmailBody(clientName: string, appointmentAtIso: string) {
  const core = reminderMessage(clientName, appointmentAtIso);
  return `${core}\n\nPlease reply Y or N by text message to the number we text you from — replies to this email are not read yet.`;
}
