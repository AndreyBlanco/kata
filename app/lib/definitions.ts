import { ObjectId } from 'mongodb';

export type Countries = {
  code: string;
  name: string;
  states: [];
};

export type Datos = {
  fName: string;
  lName: string;
  ced: string;
  bdate: string;
  country: string;
  state: string;
  dep: string;
  district: string;
  ward: string;
  street: string;
  tutor: string;
  tutorPhone: string;
  tutorEmail: string;
}

export type Plan = {
  percepcion: string;
  atencion: string;
  emocion: string;
  motivacion: string;
  memorias: string;
  funciones: string;
  dislexia: string;
  discalculia: string;
  disortografia: string;
  disgrafia: string;
  dispraxia: string;
  verbal: string;
  lento: string;
  tda: string;
  fortalezas: string;
  mediacion: string;
  casa: string;
  especificas: string;
}

export type Student = {
  _id: ObjectId;
  teacher: ObjectId;
  datos: Datos;
  valoracion: [];
  plan: Plan;
};

export type User = {
  _id: ObjectId;
  name: string;
  email: string;
  password: string;
};
