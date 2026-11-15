const mongoose = require("mongoose");

async function connectDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI não configurada no arquivo .env");
  }

  mongoose.set("strictQuery", true);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log(
    `MongoDB conectado em ${mongoose.connection.host}/${mongoose.connection.name}`,
  );

  return mongoose.connection;
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

module.exports = { mongoose, connectDatabase, disconnectDatabase };
