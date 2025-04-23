/**
 * Represents a shared secret.
 */
export type Secret = {
  /**
   * The unique identifier of the secret.
   */
  id: string;
  /**
   * The optional password for the secret.
   */
  password: string | null;
  /**
   * The optional expiration date of the secret.
   */
  expiration_date: Date | null;
  /**
   * The unique share ID for accessing the secret.
   */
  share_id: string;
  /**
   * The timestamp when the secret was created.
   */
  created_at: Date;
  /**
   * The timestamp when the secret was last updated.
   */
  updated_at: Date;
};

/**
 * Represents a fragment of a shared secret.
 */
export type SecretFragment = {
  /**
   * The unique identifier of the secret fragment.
   */
  id: string;
  /**
   * The ID of the secret this fragment belongs to.
   */
  secret_id: string;
  /**
   * The order of the fragment in the original secret.
   */
  fragment_order: number;
  /**
   * The encrypted text of the secret fragment.
   */
  fragment_text: string;
};
