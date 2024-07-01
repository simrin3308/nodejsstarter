import userModel from "../model/userModel.js";
import Errorhandler from "../utils/ErrorHandler.js";
import { catchAsyncErrors } from "../middleware/catchAsyncErrors.js";
import jwt from "jsonwebtoken";
import sendMail from "../utils/sendMail.js";
import ejs from "ejs";
import path from "path";
import fs from "fs";

import { sendToken } from "../utils/jwt.js";
import { redis } from "../utils/redis.js";

import cloudinary from "cloudinary";

// const __dirname = "D:\\lms\\server";
const __dirname = path.resolve();
// const __dirname = path.resolve("D:\\lms\\server");

export const createUser = catchAsyncErrors(async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return next(new Errorhandler("Please Enter all the fields", 400));
    }

    const isEmailExists = await userModel.findOne({ email });

    if (isEmailExists) {
      return next(new Errorhandler("Email already exists", 400));
    }

    const user = {
      name,
      email,
      password,
    };

    const activationToken = createActivationToken(user);

    const activationCode = activationToken.activationCode;
    const data = {
      name,
      email,
      activationCode,
    };

    // Construct file path to the email template
    const filePath = path.join(__dirname, "mails", "activation-email.ejs");

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return next(new Errorhandler("Template file not found", 404));
    }
    const renderedHTML = ejs.render(filePath, data);
    const html = await ejs.renderFile(filePath, data);

    try {
      await sendMail({
        email: user.email,
        subject: "Activate Your Account",
        template: "activation-email.ejs",
        name: data.name,
        activationCode: data.activationCode,
        data,
        filePath,
      });

      res.status(201).json({
        success: true,
        message: "Please check your email to activate your account.",
        activationToken: activationToken.token,
        email: user.email,
      });
    } catch (error) {
      return next(new Errorhandler(error.message, 500));
    }
  } catch (error) {
    return next(new Errorhandler(error.message, 400));
  }
});


// login
export const login = catchAsyncErrors(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new Errorhandler("Please Enter Email & Password", 400));
  }

  const user = await userModel.findOne({ email }).select("+password");

  if (!user) {
    return next(new Errorhandler("Invalid Email or Password", 401));
  }

  const isPasswordMatched = await user.comparePassword(password);
  console.log("ppp");

  if (!isPasswordMatched) {
    return next(new Errorhandler("Invalid Email or Password", 401));
  }
  sendToken(user, 200, res);
});
export const logOutUser = catchAsyncErrors(async (req, res, next) => {
  try {
    res.cookie("refreshToken", null, {
      maxAge: 1,
    });
    res.cookie("accessToken", null, {
      maxAge: 1,
    });

    redis.del(req?.user?._id || "");

    res.status(200).json({
      success: true,
      message: "Logged Out",
    });
  } catch (error) {
    return next(new Errorhandler(error.message, 500));
  }
});

// update access token

export const updateAccessToken = catchAsyncErrors(async (req, res, next) => {
  const { refreshToken: refresh_Token } = req.cookies;

  if (!refresh_Token) {
    return next(new Errorhandler("Please Login to access this resource", 401));
  }

  const decodedData = jwt.verify(refresh_Token, process.env.REFRESH_TOKEN);

  if (!decodedData) {
    return next(new Errorhandler("Refresh token is not valid", 401));
  }

  const user = await userModel.findById(decodedData.id);

  if (!user) {
    return next(new Errorhandler("User not found", 401));
  }

  const accessToken = jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN);
  const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN);

  const accessTokenExp = process.env.ACCESS_TOKEN_EXPIRE || "15";
  const refreshTokenExp = "3";

  const accessTokenOptions = {
    expires: new Date(Date.now() + parseInt(accessTokenExp) * 60 * 60 * 1000),
    httpOnly: true,
    maxAge: parseInt(accessTokenExp) * 60 * 60 * 1000,
    sameSite: "lax",
  };
  const refreshTokenOptions = {
    expires: new Date(Date.now() + refreshTokenExp * 60 * 60 * 24 * 1000),
    httpOnly: true,
    maxAge: parseInt(accessTokenExp) * 60 * 60 * 24 * 1000,
    // sameSite
  };

  req.user = user;

  res.cookie("refreshToken", refreshToken, refreshTokenOptions);

  res.cookie("accessToken", accessToken, accessTokenOptions);

  await redis.set(user._id, JSON.stringify(user));

  res.status(200).json({
    success: true,
    user,
    accessToken,
    refreshToken,
  });
});

// get user info

export const getUserInfo = catchAsyncErrors(async (req, res, next) => {
  const user = await userModel.findById(req.user?._id);

  if (!user) {
    return next(new Errorhandler("User not found", 401));
  }

  res.status(200).json({
    success: true,
    user,
  });
});

// social auth

export const socialAuth = catchAsyncErrors(async (req, res, next) => {
  const { name, email, avatar, provider } = req.body;

  const user = await userModel.findOne({ email });

  if (!user) {
    const user = await userModel.create({
      name,
      email,
      avatar,
      provider,
    });
  } else {
    sendToken(user, 200, res);
  }
});

export const updateUser = catchAsyncErrors(async (req, res, next) => {
  try {
    const { name, email, avatar } = req.body;

    const user = await userModel.findById(req.user._id);

    if (!user) {
      return next(new Errorhandler("User not found", 401));
    }

    const isEmailAlreadyTaken = await userModel.findOne({ email });

    if (isEmailAlreadyTaken) {
      return next(new Errorhandler("Email already taken", 401));
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.avatar = avatar || user.avatar;

    await user.save();

    await redis.set(user._id, JSON.stringify(user));

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return next(new Errorhandler(error.message, 500));
  }
});

// update profile picture

export const updateProfilePicture = catchAsyncErrors(async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user._id);

    const { avatar } = req.body;

    if (!user) {
      return next(new Errorhandler("User not found", 401));
    }

    if (user?.avatar?.public_id) {
      await cloudinary.v2.uploader.destroy(user?.avatar?.public_id);

      const myCloud = await cloudinary.v2.uploader.upload(avatar, {
        folder: "avatars",
        width: 150,
      });

      user.avatar = {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      };
    } else {
      const myCloud = await cloudinary.v2.uploader.upload(avatar, {
        folder: "avatars",
        width: 150,
      });

      user.avatar = {
        public_id: myCloud.public_id,
        url: myCloud.secure_url,
      };
    }
    await user.save();
    await redis.set(user._id, JSON.stringify(user));

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return next(new Errorhandler(error.message, 500));
  }
});

export const getAllUsers = catchAsyncErrors(async (req, res, next) => {
  try {
    const users = await userModel.find();

    if (!users) {
      return next(new Errorhandler("No users found", 404));
    }

    return res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    return next(new Errorhandler(error.message, 500));
  }
});

export const changeUserRole = catchAsyncErrors(async (req, res, next) => {
  try {
    const { id, role } = req.body;

    const user = await userModel.findById(id);

    if (!user) {
      return next(new Errorhandler("User not found", 404));
    }

    user.role = role;

    await user.save();

    await redis.set(user._id, JSON.stringify(user));

    return res.status(200).json({
      success: true,
      message: "User role updated successfully",
      user,
    });
  } catch (error) {
    return next(new Errorhandler(error.message, 500));
  }
});

