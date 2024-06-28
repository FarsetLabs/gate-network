const cardHasAccess = (req) => {
  const { check } = req.body;
  if (!check) return false;

  // TODO: Look up user in DB, API, whatever
  return true;
};

module.exports = cardHasAccess;
