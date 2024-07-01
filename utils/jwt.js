import jwt from "jsonwebtoken";
import { redis } from "./redis.js";

export const sendToken = (user, statusCode, res) => {
  const accessToken = user.signAccessToken();
  const refreshToken = user.signRefreshToken();

  
  // parse environment variables to integrates if redis is enabled
  
  const accessTokenExp = process.env.ACCESS_TOKEN_EXPIRE || "15";
  const refreshTokenExp =  "3";
  
  
  // upload session to redis
    redis.set(user._id, JSON.stringify(user));


  const accessTokenOptions = {
    expires: new Date(Date.now() + parseInt(accessTokenExp) * 60 * 60 * 1000),
    httpOnly: true,
    maxAge: parseInt(accessTokenExp)  * 60 * 60 * 1000,
    sameSite : "lax"
  };
  const refreshTokenOptions = {
    expires: new Date(Date.now() + refreshTokenExp * 60 * 60 * 24 * 1000),
    httpOnly: true,
    maxAge: parseInt(accessTokenExp) * 60 * 60 * 24 * 1000,
    // sameSite
  };

  // only set secure true in production mode

  if (process.env.NODE_ENV === "production") {
    accessTokenOptions.secure = true;
    refreshTokenOptions.secure = true;
  }

  res.cookie("accessToken", accessToken, accessTokenOptions);
  res.cookie("refreshToken", refreshToken, refreshTokenOptions);

  res.status(statusCode).json({
    success: true,
    user,
    accessToken,
    refreshToken,
  });
};
