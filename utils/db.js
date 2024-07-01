import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const connection = await mongoose.connect(process.env.DB_URI);
    console.log(`MongoDB connected with server`);
  } catch (error) {
    console.error("MongoDB connection failed:", error);
  }
};

export default connectDB;
