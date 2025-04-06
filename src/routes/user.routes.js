import { Router } from "express";
import {
  changeCurrentPassword,
  getChannelProfile,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateAccountDetails,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

// protected routes
router.route("/channel-profile/").post(verifyJwt, getChannelProfile)
router.route("/logout").get(verifyJwt, logoutUser);
router.route("/refresh-token").get(refreshAccessToken);
router.route("/change-password").post(verifyJwt, changeCurrentPassword);
router.route("/get-current-user").get(verifyJwt, getCurrentUser);
router.route("/update-account-details").post(verifyJwt, updateAccountDetails);

export default router;
