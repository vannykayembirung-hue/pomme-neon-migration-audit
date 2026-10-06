'use client'

/** Admin-only right-to-erasure button. Confirms, POSTs, reloads. */
export function ForgetButton({ email }: { email: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!window.confirm(`Forget ${email}?\n\nThis permanently deletes the account, its saved week and preferences. This cannot be undone.`)) return
        void fetch(`/admin/api/metrics?action=forget-account&email=${encodeURIComponent(email)}`, { method: 'POST' }).then(() =>
          window.location.reload(),
        )
      }}
      className="rounded-lg border border-oxblood/20 px-2.5 py-1 text-xs font-bold text-oxblood/70 transition hover:bg-oxblood hover:text-cream"
    >
      Forget
    </button>
  )
}
