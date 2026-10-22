import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';

export const generateAccessToken = (payload) => {
  return jwt.sign(payload, ENV.JWT_SECRET, {
    expiresIn: ENV.JWT_EXPIRES_IN
  });
};

export const generateRefreshToken = (payload) => {
  return jwt.sign(payload, ENV.JWT_REFRESH_SECRET, {
    expiresIn: ENV.JWT_REFRESH_EXPIRES_IN
  });
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, ENV.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, ENV.JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
};
