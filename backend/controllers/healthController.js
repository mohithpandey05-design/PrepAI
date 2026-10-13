const getHealth = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server Running Successfully',
  });
};

module.exports = {
  getHealth,
};
