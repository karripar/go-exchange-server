/* eslint-disable @typescript-eslint/no-unused-vars */
import mongoose from 'mongoose';
import app from '../src/app';
import dotenv from 'dotenv';
import randomstring from 'randomstring';
import {UserInfo} from '../src/types/LocalTypes';
import userModel from '../src/api/models/userModel';
import jwt from 'jsonwebtoken';
import {
  getUserProfile,
  searchUsersByEmail,
  deleteUser,
  toggleBlockUser,
  getBlockedUsers,
} from './controllers/testUsers';
import { addFavorite, removeFavorite } from './controllers/testFavorites';

dotenv.config();

describe('User related tests', () => {
  let testUser: UserInfo;
  let testAdmin: UserInfo;
  let testToken: string;
  let testAdminToken: string;

  beforeAll(async () => {
    const mongoURI = process.env.DB_TEST_URL;
    if (!mongoURI) throw new Error('Missing DB_URL in environment variables');
    await mongoose.connect(mongoURI);

    testUser = await userModel.create({
      name: 'Test User',
      userName: 'testuser',
      email: `testuser_${randomstring.generate(7)}@example.com`,
      user_level_id: 1,
      googleId: randomstring.generate(12),
    });

    testToken = jwt.sign(
      { _id: testUser._id, level_name: 'User' },
      process.env.JWT_SECRET as string,
      { expiresIn: '3h' }
    );

    testAdmin = await userModel.create({
      name: 'Test Admin',
      userName: 'testadmin',
      email: `testadmin_${randomstring.generate(7)}@example.com`,
      user_level_id: 3,
      googleId: randomstring.generate(12),
    });

    testAdminToken = jwt.sign(
      { _id: testAdmin._id, level_name: 'SuperAdmin' },
      process.env.JWT_SECRET as string,
      { expiresIn: '3h' }
    );
  });

  afterAll(async () => {
    if (testUser) await userModel.findByIdAndDelete(testUser._id);
    if (testAdmin) await userModel.findByIdAndDelete(testAdmin._id);
    await mongoose.connection.close();
  });

  it('should retrieve user profile', async () => {
    await getUserProfile(app, testToken);
  });

  it('should allow admin to get blocked users', async () => {
    await getBlockedUsers(app, testAdminToken);
  });

  it('should search users by email', async () => {
    const res = await searchUsersByEmail(app, testUser.email, testAdminToken);
    expect(res.users?.length).toBeGreaterThanOrEqual(1);
  });

  const destination = {
    destination: 'Test Destination',
    url: `https://example.com/${randomstring.generate(5)}`,
  };

  it('Should add a favorite destination for the user', async () => {
    await addFavorite(app, testToken, destination);
  });

  it('Should remove a favorite destination for the user', async () => {
    await removeFavorite(app, testToken, destination);
  });

  it('should toggle block status of a user', async () => {
    const res = await toggleBlockUser(app, testUser._id.toString(), testAdminToken);
    expect(res.message).toMatch(/User successfully (blocked|unblocked)/);
  });

  it('should delete a user', async () => {
    const newUser = await userModel.create({
      name: 'Delete Me',
      userName: 'deleteme',
      email: `deleteme_${randomstring.generate(7)}@example.com`,
      user_level_id: 1,
      googleId: randomstring.generate(12),
    });

    const res = await deleteUser(app, newUser._id.toString(), testAdminToken);
    expect(res.message).toBe('User deleted successfully');
  });
});

