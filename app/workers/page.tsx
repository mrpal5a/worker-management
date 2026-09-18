import { redirect } from 'next/navigation';

/** Workers moved under /add as a sub-tab. Kept as a redirect for old bookmarks/links. */
export default function WorkersRedirect() {
  redirect('/add/workers');
}
