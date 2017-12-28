import { combineReducers } from 'redux';

export const loggedIn = (state = false, action) => {
  switch (action.type) {
    case 'LOGOUT':
      return false;
    case 'LOGIN':
      return true;
    default:
      return state;
  }
};

const rootReducer = combineReducers({
  loggedIn,
});

export default rootReducer;
