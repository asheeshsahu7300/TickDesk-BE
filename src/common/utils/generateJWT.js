const jwt = require("jsonwebtoken");

class Authorization {
  constructor() {
    // Binding methods to ensure the correct context
    this.generateJwtToken = this.generateJwtToken.bind(this);
    this.generateAutomationToken = this.generateAutomationToken.bind(this);
    this.isAccessTokenExpired = this.isAccessTokenExpired.bind(this);
  }

  async generateJwtToken(user) {
    const userJwt = jwt.sign(
      {
        id: user._id,
        email: user.email,
      },
      process.env.JWT_KEY, // Use a secure and environment-stored secret
      { expiresIn: "1h" } // Note: Corrected '1hr' to '1h' as per JWT format
    );
    return userJwt;
  }

  async generateAutomationToken() {
    const payload = {
      role: "automation", // Define the role for this token
      // Include any other properties needed for automation
    };

    const secret = process.env.JWT_KEY; // Replace with your actual secret
    const options = {
      expiresIn: "1h", // Set the token expiration
    };
    const sysToken = jwt.sign(payload, secret, options);
    return sysToken;
  }
  async isAccessTokenExpired(token) {
    try {
      const decoded = jwt.decode(token);
      console.log(decoded);
      if (!decoded || !decoded.exp) {
        throw new Error("Invalid token structure");
      }
      const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
      return decoded.exp < currentTime; // Check if token is expired
    } catch (error) {
      console.error("Error checking token expiry:", error.message);
      return true; // Assume expired if there's an error
    }
  }
}

module.exports = new Authorization();
