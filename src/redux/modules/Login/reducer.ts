import {
  CHANGELOGINSTATE,
  SETUSERINFO,
  SHOWLOGINMODAL,
} from '@/redux/constant';

let initState = {
  showLoginModal: false,
  isLogin: false,
  userInfo: null,
};

export default function LoginReducer(
  prevState = initState,
  action: { [propName: string]: any },
) {
  const { type, data } = action;
  let newState = { ...prevState };

  switch (type) {
    case SHOWLOGINMODAL:
      if (typeof data == 'undefined')
        newState.showLoginModal = !newState.showLoginModal;
      else newState.showLoginModal = data;
      break;

    case CHANGELOGINSTATE:
      if (typeof data == 'undefined') newState.isLogin = !newState.isLogin;
      else newState.isLogin = data;
      break;

    case SETUSERINFO:
      newState.userInfo = { ...data };
      break;

    default:
      break;
  }

  return newState;
}