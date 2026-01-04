
/**
 * Create a new admin.
 * @param admin - The admin object containing admin details.
 * @returns The ID of the newly created admin.
 */
export const createAdmin = async (admin: any, domainName: any): Promise<number> => {
  try {
    const query = `
      SELECT * from "${domainName}"."CREATE_ADMIN"(
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      )`;
    const values = [
      admin.first_name, admin.last_name, admin.email_address, admin.designation, admin.phone_number, admin.user_name, admin.password, admin.reconfirm_password, admin.created_by
    ];

    const result = await pool.query(query, values);
    return result.rows[0].create_admin;
  } catch (error: any) {
    console.log(error);
    console.error('Error creating admin', { message: error.message, stack: error.stack });
    throw error
  }
};
