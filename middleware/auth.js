import User from "../model/userModel.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import { catchAsyncErrors } from "./catchAsyncErrors.js";

import jwt from "jsonwebtoken";

export const isAuthenticated = catchAsyncErrors(async (req, res, next) => {
  const { accessToken } = req.cookies;

  if (!accessToken) {
    return next(new ErrorHandler("Please Login to access this resource", 401));
  }

  const decodedData = jwt.verify(accessToken, process.env.ACCESS_TOKEN);

  if (!decodedData) {
    return next(new ErrorHandler("Access token is not valid", 401));
  }

  req.user = await User.findById(decodedData.id);

  next();
});

export const isAuthenticatedNormalCheck = catchAsyncErrors(
  async (req, res, next) => {
    const { accessToken } = req.cookies;

    try {
      const decodedData = jwt.verify(accessToken, process.env.ACCESS_TOKEN);

      req.user = await User.findById(decodedData.id);
      next();
    } catch (error) {
      if (
        error.message === "JsonWebTokenError" ||
        error.message === "TokenExpiredError"
      ) {
        return res
          .status(401)
          .json({
            success: false,
            message: "Invalid or expired token. Please log in again.",
          });
      } else {
        return next();
      }
    }
  }
);

// validate user roles

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandler(
          `Role (${req.user.role}) is not allowed to access this resource`,
          403
        )
      );
    }
    next();
  };
};
