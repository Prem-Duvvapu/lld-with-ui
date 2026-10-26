/** Display a server timestamp without pretending that rounded JSON numbers are exact. */
export function formatKvExpiry(epoch, noExpiry = 'No expiry') {
  if (epoch == null) return noExpiry;
  if (!Number.isSafeInteger(epoch)) return 'Timestamp outside this browser’s precise numeric range';
  const date = new Date(epoch);
  return Number.isFinite(date.getTime()) ? date.toISOString()
    : `${epoch} ms since the UTC epoch (outside supported date range)`;
}
