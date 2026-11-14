const userService = require("./userService");
const responseWrapper = require("../helper/wrapper");

class UserController {
  static async userLogin(req, res) {
    try {
      const { token } = await userService.login(req.body);

      res.cookie("token", token, {
        httpOnly: true, // Mencegah akses dari JavaScript
        secure: true,
        sameSite: "Strict",
        maxAge: 3600000
      });

      responseWrapper(res, 200, "Login Successfully", { token });
    } catch (error) {
      console.log("Error in userLogin:", error);
      responseWrapper(res, error.statusCode || 400, error.message, {});
    }
  }

  static async userRegister(req, res) {
    try {
      const user = await userService.register(req.body || {});
      responseWrapper(res, 200, "User registered successfully. Please check your email to verify your account.", user);
    } catch (error) {
      responseWrapper(res, error.statusCode || 400, error.message, {});
    }
  }

  static async verifyEmail(req, res) {
    try {
      const token = req.query.token || (req.body && req.body.token);
      const user = await userService.verifyEmail(token);
      responseWrapper(res, 200, "Email verified successfully", user);
    } catch (error) {
      responseWrapper(res, error.statusCode || 400, error.message, {});
    }
  }

  static async forgotPassword(req, res) {
    try {
      const email = req.body && req.body.email;
      const result = await userService.forgotPassword(email);
      responseWrapper(res, 200, result.message, {});
    } catch (error) {
      responseWrapper(res, error.statusCode || 400, error.message, {});
    }
  }

  static async resetPassword(req, res) {
    try {
      const result = await userService.resetPassword(req.body || {});
      responseWrapper(res, 200, result.message, {});
    } catch (error) {
      responseWrapper(res, error.statusCode || 400, error.message, {});
    }
  }
}

module.exports = UserController;