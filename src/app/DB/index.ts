import config from '../config';
import bcrypt from 'bcrypt';
import AdminModel from '../modules/Dashboard/auth/Admin.model';

const seedAdmin = async () => {
  try {
    const isSuperAdminExists = await AdminModel.findOne({
      $or: [
        { role: 'Super_Admin' },
        { email: config.super_admin_email },
      ],
    });

    if (!isSuperAdminExists) {
      const hashedPassword = await bcrypt.hash(
        config.super_admin_password as string,
        Number(config.bcrypt_salt_rounds),
      );

      await AdminModel.create({
        name: `${config.super_admin_first_name} ${config.super_admin_last_name}`.trim(),
        email: config.super_admin_email,
        password: hashedPassword,
        role: 'Super_Admin',
        isEmailVerified: true,
        isBlocked: false,
      });

      console.log('✅ Super Admin seeded successfully!');
    } else {
      console.log('ℹ️ Super Admin already exists. Skipping seed.');
    }
  } catch (error) {
    console.error('❌ Error seeding Super Admin:', error);
  }
};

export default seedAdmin;
