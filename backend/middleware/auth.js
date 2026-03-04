const passport = require("passport");

const requireAuth = (req, res, next) => {
  passport.authenticate("jwt", { session: false }, (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      return res.status(401).json({
        error:
          info?.message || "Your session has expired. Please log in again.",
      });
    }

    req.user = user;
    next();
  })(req, res, next);
};

module.exports = requireAuth;
