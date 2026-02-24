/* eslint-disable @typescript-eslint/no-unused-vars */
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app';
import {MessageResponse} from '../src/types/MessageTypes';
import randomstring from 'randomstring';
// import {getFavorites} from '../test/controllers/testFavorites';


describe('GET /api/v1', () => {
  beforeAll(async () => {
    if (!process.env.DB_TEST_URL) {
      throw new Error('DB_URL is not defined');
    }
    await mongoose.connect(process.env.DB_TEST_URL);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should do something', async () => {
    console.log('This is a placeholder test. Replace with actual tests.');
    expect(true).toBe(true);
  });
});
