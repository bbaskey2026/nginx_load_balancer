const express = require("express");

const UserController = require("../controllers/userController");
const userService = require("../services/userService");

const userController = new UserController(userService);

const router = express.Router();

router.get("/", userController.getUsers);
router.get("/:id", userController.getUserById);
router.post("/", userController.createUser);
router.put("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);

module.exports = router;