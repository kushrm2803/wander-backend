require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const tripRoutes = require("./routes/tripRoutes");
const blogRoutes = require("./routes/blogRoutes");
const chatRoutes = require("./routes/chatRoutes");
const questionRoutes = require("./routes/questionRoutes");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static("public"));


// Define Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/questions", questionRoutes);

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (error) {
    console.error("Error starting the server:", error);
    process.exit(1);
  }
};

startServer();
