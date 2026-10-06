import { createSlice } from '@reduxjs/toolkit'

const user = JSON.parse(localStorage.getItem('user'))

const initialState = user
  ? { isLoggedIn: true, user }
  : { isLoggedIn: false, user: null }

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      state.isLoggedIn = true
      state.user = action.payload
      // Persist to localStorage so session survives page refresh and browser reopen
      localStorage.setItem('user', JSON.stringify(action.payload))
    },
    logout: (state) => {
      state.isLoggedIn = false
      state.user = null
      // Clear all auth-related keys from localStorage and sessionStorage
      localStorage.removeItem('user')
      sessionStorage.removeItem('user')
      sessionStorage.clear()
    }
  },
})

export const { loginSuccess, logout } = authSlice.actions

export default authSlice.reducer
