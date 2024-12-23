import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
  const coverImageLocalPath = req.files?.coverImage[0].path;
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
export { registerUser };
