import { redirect } from 'next/navigation';

/** /admin → the overview, as the old admin did. */
export default function AdminIndex() {
  redirect('/admin/dashboard');
}
