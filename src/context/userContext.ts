import {createContext} from 'react';

interface UserContextType {
  isLoggedIn: boolean;
  setLoggedIn: (value: boolean) => void;
  isDefaultPassword: boolean;
  setDefaultPassword: (value: boolean) => void;
  userId: string | undefined;
  setUserId: (value: string) => void;
  name: string | undefined;
  setName: (value: string) => void;
  insideOutside: string | undefined;
  setInsideOutside: (value: string) => void;
  email: string | undefined;
  setGender: (value: string) => void;
  gender: string | undefined;
  setEmail: (value: string | undefined) => void;
  weight: number | undefined;
  setWeight: (value: number | undefined) => void;
  picture: string | undefined;
  setPicture: (value: string | undefined) => void;
  accessToken: string | undefined;
  setAccessToken: (value: string | undefined) => void;
}

const UserContext = createContext<UserContextType | null>(null);

export default UserContext;
