import api from './api';

class AuthService {
  login(email, password) {
    return api
      .post('auth/login', {
        email,
        password
      })
      .then(response => {
        if (response.data.token) {
          localStorage.setItem('user', JSON.stringify(response.data));
        }
        return response.data;
      });
  }

  logout() {
    localStorage.removeItem('user');
  }

  register(firstName, lastName, email, password, role) {
    return api.post('auth/register', {
      firstName,
      lastName,
      email,
      password,
      role
    });
  }
}

export default new AuthService();
