const userRepository = require("../repositories/user.repository");
const { NotFoundError, ValidationError, ConflictError } = require("../utils/errors");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PG_UNIQUE_VIOLATION = "23505";

// ---- helpers ----
const assertId = (id) => {
    if (!Number.isInteger(id) || id <= 0) throw new ValidationError("Invalid user id");
};

const assertEmail = (email) => {
    if (!EMAIL_RE.test(email)) throw new ValidationError("Invalid email");
};

const mapDbError = (err) =>
    err.code === PG_UNIQUE_VIOLATION ? new ConflictError("Email already exists") : err;

// ---- business logic ----

exports.getUsers = async () => {
    return userRepository.findAll();
};

exports.getUserById = async (id) => {
    assertId(id);
    const user = await userRepository.findById(id);
    if (!user) throw new NotFoundError("User not found");
    return user;
};

exports.createUser = async (userData = {}) => {
    const { name, email } = userData;
    if (!name || !email) throw new ValidationError("Name and email are required");
    assertEmail(email);

    try {
        return await userRepository.create({ name: name.trim(), email: email.toLowerCase() });
    } catch (err) {
        throw mapDbError(err);
    }
};

exports.updateUser = async (id, userData = {}) => {
    const { name, email } = userData;
    assertId(id);
    if (name === undefined && email === undefined) {
        throw new ValidationError("Provide name or email to update");
    }
    if (email !== undefined) assertEmail(email);

    try {
        const user = await userRepository.update(id, {
            name: name?.trim(),
            email: email?.toLowerCase()
        });
        if (!user) throw new NotFoundError("User not found");
        return user;
    } catch (err) {
        throw mapDbError(err);
    }
};

exports.deleteUser = async (id) => {
    assertId(id);
    const user = await userRepository.delete(id);
    if (!user) throw new NotFoundError("User not found");
    return user;
};