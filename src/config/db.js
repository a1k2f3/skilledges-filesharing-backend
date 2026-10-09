const mongoose = require("mongoose");
const User = require("../schema/User");

const ensureIdentityIndexes = async () => {
  const collectionExists = await User.db.db
    .listCollections({ name: User.collection.collectionName }, { nameOnly: true })
    .hasNext();
  if (!collectionExists) await User.createCollection();

  const indexes = await User.collection.indexes();

  for (const field of ["email", "username"]) {
    const index = indexes.find((candidate) => candidate.key[field] === 1 && Object.keys(candidate.key).length === 1);
    if (index && (index.unique !== true || index.sparse !== true)) {
      await User.collection.dropIndex(index.name);
    }

    await User.collection.createIndex({ [field]: 1 }, { unique: true, sparse: true });
  }
};

const connectDB = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGO_URI);
    await ensureIdentityIndexes();

    console.log(`MongoDB connected: ${connection.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;