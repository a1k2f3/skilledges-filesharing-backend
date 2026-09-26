const express = require("express");
const authenticate = require("../middleware/auth.middleware");
const requireRole = require("../middleware/role.middleware");
const { loadFile, requireFileOwner } = require("../middleware/file.middleware");
const { shareFile, shareFileWithTeam, listReceivedShares, listSentShares, revokeShare } = require("../controllers/share.controller");

const router = express.Router();

router.use(authenticate);
router.post("/files/:fileId", loadFile, requireFileOwner, shareFile);
router.post("/files/:fileId/team/:teamId", requireRole("admin"), loadFile, requireFileOwner, shareFileWithTeam);
router.get("/received", listReceivedShares);
router.get("/sent", listSentShares);
router.delete("/:shareId", revokeShare);

module.exports = router;
