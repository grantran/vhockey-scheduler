auth.onAuthStateChanged(function(user) {
  if (user) {
    console.log("user is signed in");
    console.log(user);
    user.getIdToken().then(function(token) {
      console.log(token);
    });
  } else {
    // No user is signed in.
    window.location.replace('login.html')
  }
});