const validateRegister = (req, res, next) => {
  const { fullName, email, password } = req.body;

  if (!fullName || fullName.length < 3) {
    res.status(400);
    return next(new Error('Name minimum 3 characters'));
  }

  const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  if (!email || !emailRegex.test(email)) {
    res.status(400);
    return next(new Error('Invalid email'));
  }

  if (!password || password.length < 8) {
    res.status(400);
    return next(new Error('Weak password'));
  }

  next();
};

module.exports = {
  validateRegister,
};
