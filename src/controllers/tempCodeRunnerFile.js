  // find if the user exist in DB
  const user = await User.findOne({
    $or: [{ username, email }],
  });