import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

//   //* Resgister controller Algo
//   //^ Request the data from user/frontend
//   //^ validate the data (specific not empty)
//   //^ check user already existed: username, email
//   //^ check for images, specific for avatar
//   //^ upload images from multer to cloudinary
//   //^ validate images uploaded on cloudinary
//   //^ create user entry in DB
//   //^ validate user entry
//   //^ remove password and refresh token from res
//   //^ send response

// Simple
// const registerUser = asyncHandler(async (req, res) => {
//   //~ req the string data from frontend and for file I use middleware(muler)
//   const { username, fullName, email, password } = req.body;
//   // console.log(email);

//   //~ validate the data
//   // The some method returns true if any field is null, undefined, or an empty string (after trimming).
//   const requiredFields = [username, fullName, email, password];
//   const isAnyFieldMissing = requiredFields.some((field) => !field?.trim());
//   if (isAnyFieldMissing) {
//     throw new ApiError(400, "All fields are required!");
//   }

//   //~ Check user Already Existed
//   const existedUser = User.findOne({
//     $or: [{ username }, { password }],
//   });
//   if (existedUser) {
//     throw new ApiError(
//       409,
//       "User with  either email or username already exists"
//     );
//   }

//   //~ check for images
//   const avatarLocalPath = req.files?.avatar[0].path;
//   const covreImageLocalPath = req.files?.coverImage[0].path;
//   if (!avatarLocalPath) {
//     throw new ApiError(400, "Avatar file is required!");
//   }
//   //~ upload on cloudinary
//   const avatar = await uploadOnCloudinary(avatarLocalPath);
//   const coverImage = await uploadOnCloudinary(covreImageLocalPath);
//   if (!avatar) {
//     throw new ApiError(400, "Avatar file is required!");
//   }

//   //~ Entry in DB
//   const user = await User.create({
//     username: username.toLowerCase(),
//     fullName,
//     email,
//     password,
//     avatar: avatar.url,
//     coverImage: coverImage?.url || "",
//   });
//   //~ validate user entry and remove the fields as well
//   const createdUser = await User.findById(user._id).select(
//     "-password -refreshToken"
//   );
//   if (!createdUser) {
//     throw new ApiError(500, "Something went wrong while uploading file");
//   }
//   //~ send response
//   res
//     .statusCode(201)
//     .json(new ApiResponse(200, createdUser, "User registered Successfully"));
// });

// modular
const registerUser = asyncHandler(async (req, res) => {
  //~ Data Req
  const { username, fullName, email, password } = req.body;

  //~ validate the data
  validateUserData({ username, fullName, email, password });

  //~ Check user Already Existed
  await checkUserExistence({ username, email });

  //~ check for images
  const avatarLocalPath = req.files?.avatar[0].path;
  // const coverImageLocalPath = req.files?.coverImage[0].path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required!");
  }

  //~ upload on cloudinary
  const { avatar, coverImage } = await handleImageUpload(
    avatarLocalPath,
    coverImageLocalPath
  );

  //~ Entry in DB
  const user = await createUser({
    username,
    fullName,
    email,
    password,
    avatar,
    coverImage,
  });
  //~ send response
  res
    .status(201)
    .json(new ApiResponse(201, user, "User registered Successfully"));
});

// Helper Functions
const validateUserData = ({ username, fullName, email, password }) => {
  const requiredFields = [username, fullName, email, password];
  const isAnyFieldMissing = requiredFields.some((field) => !field?.trim());
  if (isAnyFieldMissing) {
    throw new ApiError(400, "All fields are required!");
  }
};

const checkUserExistence = async ({ username, email }) => {
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }
};

const handleImageUpload = async (avatarLocalPath, coverImageLocalPath) => {
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = coverImageLocalPath
    ? await uploadOnCloudinary(coverImageLocalPath)
    : null;

  if (!avatar) {
    throw new ApiError(400, "Avatar upload failed!");
  }

  return { avatar: avatar.url, coverImage: coverImage?.url || "" };
};

const createUser = async ({
  username,
  fullName,
  email,
  password,
  avatar,
  coverImage,
}) => {
  const user = await User.create({
    username: username.toLowerCase(),
    fullName,
    email,
    password,
    avatar,
    coverImage,
  });
  //~ validate user entry and remove the fields as well
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while creating the user");
  }

  return createdUser;
};

const genAccessAndRefreshTok = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "something went wrong while generating the refresh or access token"
    );
  }
};
// * userLogin
const loginUser = asyncHandler(async (req, res) => {
  // if they gave referesh token, match the refresh token to db refresh token
  // check if the refresh token time remaining
  // if match then give to access token
  // Get the login info from user
  // check the user into to db entry
  // if matches then return the access and refesh token

  // another detailed algorithm
  // get the data from req body
  const { username, email, password } = req.body;
  // add validation to the data
  if (!(username || email)) {
    throw new ApiError(400, "username or email is required!");
  }
  if (!password) {
    throw new ApiError(400, "password is required!");
  }
  // find if the user exist in DB
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });
  // validate to the user from DB
  if (!user) {
    throw new ApiError(404, "user not found!");
  }
  const isPassCorrect = await user.isPasswordCorrect(password);
  if (!isPassCorrect) {
    throw new ApiError(400, "incorrect password");
  }
  // generate the access and refresh token
  const { refreshToken, accessToken } = await genAccessAndRefreshTok(user._id);
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // seding the reponse in cookies
  const options = {
    httpOnly: true,
    secure: true,
  };
  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "user logged In successfully"
      )
    );
});

// * user loggout
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: { refreshToken: undefined },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user logged out successfully"));
});

// * refresh access token
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized Request");
  }

  const decodedToken = jwt.verify(
    incomingRefreshToken,
    process.env.REFRESH_TOKEN_SECRET
  );

  if (!decodedToken) {
    throw new ApiError(402, "Invalid Refresh Token");
  }

  const user = await User.findById(decodedToken?._id);

  if (user?.refreshToken !== incomingRefreshToken) {
    throw new ApiError(403, "Refresh Token Expired or Used");
  }

  const { accessToken, refreshToken: updatedRefreshToken } =
    await genAccessAndRefreshTok(user?._id);

  const options = {
    httpOnly: true,
    secure: true,
  };
  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", updatedRefreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          accessToken,
          refreshToken: updatedRefreshToken,
        },
        "Access Token Refreshed Successfully"
      )
    );
});

// * change current password
const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!(oldPassword && newPassword)) {
    throw new ApiError(401, "Password Fields are Required");
  }
  const user = req.user;
  if (!user) {
    throw new ApiError("401", "User not Found");
  }
  const currentUser = await User.findById(user?._id);
  if (!currentUser) {
    throw new ApiError("401", "User not Found");
  }
  const isPasswordCorrect = await currentUser.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Incorrect Password");
  }
  currentUser.password = newPassword;
  await currentUser.save();

  res
    .status(201)
    .json(new ApiResponse(201, [], "Password changed Successfully "));
});

// * get current user
const getCurrentUser = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current User Fetched Successsfully"));
});

// * update Account Details
const updateAccountDetails = asyncHandler(async (req, res) => {
  // * Algo :
  /* 
    ^ get the updated details from user (email, fullName)
    ^ Validate the Details from user
    ^ get the user from verifyJWT middle 
    ^ update the detials in MongoDB 
    ^ return updated chages with success message
  */

  const { email, fullName } = req.body;
  if (!(email || fullName)) {
    throw new ApiError(401, "email or fullName is required");
  }
  const user = req.user;
  user.fullName = fullName ? fullName : user.fullName;
  user.email = email ? email : user.email;
  const updatedUser = await user.save();
  if (!updatedUser) {
    throw new ApiError(500, "Error while updated detials in DB");
  }
  res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "User Updated Successfully"));
});

// TODO: Complete this with cloudinary utility to delete file
// * update avatar file
const updateUserAvatar = asyncHandler(async (req, res) => {});
// TODO: Complete this with cloudinary utility to delete file
// * update coverimage file
const updateUserCoverImage = asyncHandler(async (req, res) => {});

// * get channel profile
const getChannelProfile = asyncHandler(async (req, res) => {
  console.log("ello")
  const { username } = req.body;

  if (!username.trim()) {
    throw new ApiError(400, "Username is requrired");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribres",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribres",
        },
        subscribeToCount: {
          $size: "$subscribedTo",
        },
        isCurrentUserSubscribed: {
            $cond: {
              if: { $in: [req.user?._id, "$subscribres.subscribe"] },
              then: true,
              else: false,
            },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        subscribeToCount: 1,
        isCurrentUserSubscribed: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
      },
    },
  ]);

  if (!channel.length) {
    throw new ApiError(400, "channel does not exist");
  }
  res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User Channel Fetched Successfully")
    );
});
export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  getChannelProfile,
};
