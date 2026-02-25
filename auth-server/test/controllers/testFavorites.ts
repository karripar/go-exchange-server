import request from "supertest";
import { Application } from "express";
import {MessageResponse} from '../../src/types/MessageTypes';


export const addFavorite = (
  url: string | Application,
  token: string,
  destination: { destination: string; url: string },
): Promise<MessageResponse> => {
  return new Promise((resolve, reject) => {
    request(url)
      .post("/api/v1/profile/favorites")
      .set("Authorization", `Bearer ${token}`)
      .send(destination)
      .expect(200)
      .end((err, res) => {
        console.log("Add Favorite Response:", res.body);
        if (err) {
          return reject(err);
        }
        resolve(res.body);
      });
  });
};

export const removeFavorite = (
  url: string | Application,
  token: string,
  destination: { destination: string; url: string },
): Promise<MessageResponse> => {
  return new Promise((resolve, reject) => {
    request(url)
      .delete("/api/v1/profile/favorites")
      .set("Authorization", `Bearer ${token}`)
      .send(destination)
      .expect(200)
      .end((err, res) => {
        console.log("Remove Favorite Response:", res.body);
        if (err) {
          return reject(err);
        }
        resolve(res.body);
      });
  });
};
