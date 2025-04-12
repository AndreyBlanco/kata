import { ObjectId } from 'mongodb';

export type Countries = {
  code: string;
  name: string;
  states: [];
};

export type States = {
  Nombre: string;
};

export type User = {
  _id: ObjectId;
  name: string;
  email: string;
  password: string;
};
