const jwt = require("jsonwebtoken");
const ENV_VAR = require("../common/envConfig");

class Authorization {
  constructor() {}

  async generateJwtToken(user) {
    const userJwt = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      process.env.JWT_KEY,
      { expiresIn: "10m" }
    );
    return userJwt;
  }
}

module.exports = Authorization;
