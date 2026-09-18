const File = require("../schema/File");

const loadFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.fileId);

    if (!file) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    req.fileRecord = file;
    next();
  } catch (error) {
    next(error);
  }
};

const requireFileOwner = (req, res, next) => {
  if (req.fileRecord.owner.toString() !== req.user.id && req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Only the file owner or an admin can manage this file"
    });
  }

  next();
};

module.exports = { loadFile, requireFileOwner };
