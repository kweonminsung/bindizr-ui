import { getSetting } from "@/lib/db";
import bcrypt from "bcrypt";

export const validateCredentials = async (
  username: string,
  password: string
): Promise<boolean> => {
  try {
    const storedUsername = getSetting("username");
    const storedPassword = getSetting("password");

    if (
      storedUsername &&
      storedPassword &&
      username === storedUsername &&
      (await bcrypt.compare(password, storedPassword))
    ) {
      return true;
    }
    return false;
  } catch (error) {
    console.error("Credential validation error:", error);
    return false;
  }
};

export const isAuthEnabled = (): boolean => {
  const username = getSetting("username");
  const password = getSetting("password");
  return !!(username && password);
};
