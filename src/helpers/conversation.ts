import crypto from "crypto";

export const getConversationId = (userId1: string, userId2: string) => {
  const sortedIds = [userId1, userId2].sort();

  const combinedIds = sortedIds.join(":");

  return crypto.createHash("sha256").update(combinedIds).digest("hex");
};
