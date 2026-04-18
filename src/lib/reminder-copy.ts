/** SMS reminder copy only — uses Europe/Dublin for the appointment time. */

export function reminderMessage(clientName: string, appointmentAtIso: string) {
  const when = new Date(appointmentAtIso).toLocaleString("en-IE", {
    timeZone: "Europe/Dublin",
    dateStyle: "medium",
    timeStyle: "short",
  });

  return `Hi ${clientName}, reminder for your appointment on ${when}. Reply Y to confirm or N to cancel.`;
}
