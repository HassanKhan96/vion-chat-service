import { sign, verify } from "jsonwebtoken";

export const generateAuthToken = (payload: {
  id: string;
  email: string;
}): string => {
  const token = sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: "1h",
  });
  return token;
};

export const verifyAuthToken = (token: string): any => {
  try {
    const decoded = verify(token, process.env.JWT_SECRET as string);
    return decoded;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};
