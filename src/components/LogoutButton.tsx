"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <div className="mt-4">
      <button
        onClick={() => signOut({ callbackUrl: "/" })}
        className="btn-primary"
      >
        Logout
      </button>
    </div>
  );
}
