import { getDBClient } from "../config/configs/db";
import { tryCatch } from "../helpers/tryCatch.helper";

export const getMyFriends = async (userId: string) => {
  const db = await getDBClient();

  const query = `
  SELECT u.id, u.username, u.email, u.created_at, u.updated_at FROM friends f
  JOIN users u ON (u.id = 
  CASE
    WHEN f.user_id1 = $1 THEN f.user_id2
    ELSE f.user_id1
  END
  )
  WHERE (user_id1 = $1 OR user_id2 = $1) AND status = true`;
  const values = [userId];

  const promise = db.query(query, values);

  return await tryCatch(promise);
};
