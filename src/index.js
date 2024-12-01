import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
  path: "./env",
});
connectDB()
.then(()=>{
  app.on("error", (error)=>{
    console.log("Error:", error)
  })


  app.listen(process.env.PORT || 8000 ,()=>{
    console.log(`Server is running at https://localhost:${process.env.PORT}`)
  })
})
.catch((err)=>{
  console.log("MONGO DB connection Error", err)
})

/*
import mongoose from "mongoose";
import { DB_NAME } from "./constant";
import express from "express";
const app = express();
(async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    app.on("error", (error) => {
      console.error("Error:", error);
    });
    app.listen(process.evn.PORT, () => {
      console.log(`App is listening on http://localhost:${process.env.PORT}`);
    });
  } catch (error) {
    console.error("Error: ", error);
    throw error;
  }
})();
*/
