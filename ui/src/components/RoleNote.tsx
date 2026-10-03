import { Link } from "react-router-dom";
import Notice from "./Notice";

/** Where a credential's rights live: on its role, managed on the Roles page. */
export default function RoleNote({
  roleName,
  holder,
}: {
  roleName: string;
  holder: "token" | "key";
}) {
  return (
    <Notice tone="info">
      This {holder} may do what the grants of role{" "}
      <span className="font-medium">{roleName}</span> permit.{" "}
      <Link to="/access/roles" className="text-blue-600 hover:underline">
        Manage roles
      </Link>
      .
    </Notice>
  );
}
