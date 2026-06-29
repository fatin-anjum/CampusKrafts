type BadgeVariant = 'success' | 'accent' | 'default' | 'muted' | 'destructive';

/** Maps a support ticket status to a Badge variant. */
export const ticketStatusVariant: Record<string, BadgeVariant> = {
  OPEN: 'accent',
  ASSIGNED: 'default',
  IN_PROGRESS: 'default',
  RESOLVED: 'success',
  CLOSED: 'muted',
};
