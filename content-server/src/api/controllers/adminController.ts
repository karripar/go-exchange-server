import userModel from "../models/userModel";

const adminLevels = [2, 3];

const getAdminEmails = async (): Promise<string[]> => {
  const admins = await userModel.find({ user_level_id: { $in: adminLevels } }, "email");
  console.log("Emails mapped: ", admins.map(admin => admin.email));
  return admins.map(admin => admin.email);
};

export { getAdminEmails };
