import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function AdminFoundationPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.staff) redirect("/login");
  return (
    <section className="grid max-w-[65ch] gap-4">
      <h1>Staff foundation</h1>
      <p>{session.user.email}</p>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <Button type="submit" variant="secondary">
          Sign out
        </Button>
      </form>
    </section>
  );
}
