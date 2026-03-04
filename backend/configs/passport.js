const passport = require("passport");
const JwtStrategy = require("passport-jwt").Strategy;
const prisma = require("../prisma");

// ✅ Extracts the JWT directly from the HTTP-Only cookie
const cookieExtractor = (req) => {
  let token = null;
  if (req && req.cookies) {
    token = req.cookies["token"];
  }
  return token;
};

const options = {
  jwtFromRequest: cookieExtractor,
  secretOrKey: process.env.JWT_SECRET || "your-super-secret-key",
};

passport.use(
  new JwtStrategy(options, async (payload, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        include: {
          organization: { select: { isActive: true, name: true } },
        },
      });

      if (!user) {
        return done(null, false, { message: "User not found" });
      }

      // ✅ SECURITY: Reject deactivated users instantly
      if (!user.isActive) {
        return done(null, false, {
          message: "This account has been deactivated",
        });
      }

      // ✅ SECURITY: Reject users if their organization is suspended
      if (user.organization && !user.organization.isActive) {
        return done(null, false, {
          message: "Organization account is suspended",
        });
      }

      return done(null, user);
    } catch (err) {
      console.error("JWT Authentication Error:", err);
      return done(err, false);
    }
  }),
);

module.exports = passport;
