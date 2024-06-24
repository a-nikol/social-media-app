document.addEventListener('DOMContentLoaded', function () {

  document.getElementById('registrationForm').addEventListener('submit', function (event) {
    event.preventDefault();

    const name = document.getElementById('fullName').value;
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const country = document.getElementById('country').value;
    const birthdate = document.getElementById('birthdate').value;
    const genderElements = document.getElementsByName('gender');
    let gender = '';
    for (const element of genderElements) {
      if (element.checked) {
        gender = element.value;
        break;
      }
    }

    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');

    // Passwords should match
    if (password !== confirmPassword) {
      errorMessage.innerText = "Passwords do not match.";
      return;
    }

    // Validating password strength
    const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&_])[A-Za-z\d@$!%*#?&_]{8,}$/;
    if (!passwordPattern.test(password)) {
      errorMessage.innerText = "Password must be at least 8 characters long and include at least one letter, one number, and one special character.";
      return;
    }

    // Validating email
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      errorMessage.innerText = "Please enter a valid email address.";
      return;
    }

    // Validating username (only alphanum characters and _)
    const usernamePattern = /^[A-Za-z0-9_]+$/;
    if (!usernamePattern.test(username)) {
      errorMessage.innerText = "Username can only contain letters, numbers, and underscores.";
      return;
    }

    // Validating name and country (only letters)
    const nameCountryPattern = /^[A-Za-z]+$/;
    if (!nameCountryPattern.test(name) || !nameCountryPattern.test(country)) {
      errorMessage.innerText = "Name or country can only contain letters.";
      return;
    }

    // Validating age (at least 5 years old)
    const birthdateObj = new Date(birthdate);
    const age = new Date().getFullYear() - birthdateObj.getFullYear();
    if (age < 5) {
      errorMessage.innerText = "You must be at least 5 years old to register.";
      return;
    }

    // Checking if gender is selected
    if (gender === '') {
      errorMessage.innerText = "Please select the gender.";
      return;
    }

    // Checking if email or username already exists
    const emailCheckQuery = Backendless.DataQueryBuilder.create().setWhereClause(`email = '${email}'`);
    const usernameCheckQuery = Backendless.DataQueryBuilder.create().setWhereClause(`username = '${username}'`);

    Promise.all([
      Backendless.Data.of('Users').find(emailCheckQuery),
      Backendless.Data.of('Users').find(usernameCheckQuery)
    ]).then(function (results) {
      const emailExists = results[0].length > 0;
      const usernameExists = results[1].length > 0;

      if (emailExists) {
        errorMessage.innerText = "This email is already registered.";
        return;
      }

      if (usernameExists) {
        errorMessage.innerText = "This username is already taken.";
        return;
      }

      const user = {
        name: name,
        username: username,
        email: email,
        password: password,
        country: country,
        birthdate: birthdate,
        gender: gender,
      };

      Backendless.UserService.register(user).then(function (registeredUser) {
        const userEmail = registeredUser.email.replace(/[@.]/g, '_');
        const folderPath = `users/${userEmail}/Shared-with-me/`;

        Backendless.Files.createDirectory(folderPath)
            .then(function () {
              errorMessage.style.display = "none";
              successMessage.innerText = "User registered successfully! Check your email to enable account!";
              setTimeout(function () {
                window.location.href = "../1practice/login.html";
              }, 5000);
            })
            .catch(function (error) {
              console.error("Error creating user folder:", error);
            });
      }).catch(function (error) {
        console.error("Registration failed:", error);
        errorMessage.innerText = "Error: " + error.message;
      });

    }).catch(function (error) {
      console.error("Error checking email/username:", error);
    });

  });
});