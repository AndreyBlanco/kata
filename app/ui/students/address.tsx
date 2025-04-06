
'use client'

import { Countries } from '@/lib/definitions';
import { useEffect, useState } from 'react';

export default function Address({ countries }: {countries: Countries[]}) {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [states, setStates] = useState([]);

  const [selectedState, setSelectedState] = useState('');
  const [deps, setDeps] = useState([]);

  const [selectedDep, setSelectedDep] = useState('');
  const [district, setDistrict] = useState([]);

  useEffect(() => { 

    const fetchStates = () => {
      if (selectedCountry) {
        countries?.map((country) => {
          if (selectedCountry == country.name) {
            setStates(country.states);
          }})
      }
    };

    fetchStates();
            
  }, [selectedCountry]);

  useEffect(() => {

    const fetchDeps = () => {
      if (selectedState) {
        states.map((state) => {
        if (selectedState == state.name) {
          setDeps(state.dep);
        }})
      }
    };

    fetchDeps();
    
  }, [selectedState]);

  useEffect(() => {

    const fetchDistrict = () => {
      if (selectedDep) {
        deps.map((dep) => {
        if (selectedDep == dep.Nombre) {
          setDistrict(dep.dist);
        }})
      }
    };

    fetchDistrict();
    
  }, [selectedDep]);


    return(
 
    <div className="relative">
        <div className="flex">
          <label htmlFor="student" className="mb-2 justify-end self-center pr-2 flex text-sm font-medium w-[100px]">
            País:
          </label>
          <select
              id="country"
              name="country"
              className="peer block w-full cursor-pointer rounded-md border border-gray-200 py-2 pl-3 text-sm outline-2 placeholder:text-gray-500"
              aria-describedby="country-error"
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
            >
              <option value="" disabled>
                Seleccione un País
              </option>
              {countries?.map((country) => (
                <option key={country.code} value={country.name}>
                  {country.name}
                </option>
              ))}
          </select>
        </div>
        <div className="flex">
          <label htmlFor="student" className="mb-2 flex justify-end self-center pr-2 text-sm font-medium w-[100px]">
           Provincia:
          </label>
            <select
              id="state"
              name="state"
              className="peer block w-full cursor-pointer rounded-md border border-gray-200 py-2 pl-3 text-sm outline-2 placeholder:text-gray-500"
              aria-describedby="state-error"
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
            >
              <option value="" disabled>
                Seleccione una Provincia
              </option>
              {states?.map((state) => (
                <option key={state.name} value={state.name}>
                  {state.name}
                </option>
              ))}
            </select>
        </div>
        <div className="flex">
          <label htmlFor="student" className="mb-2 flex justify-end self-center pr-2 text-sm font-medium w-[100px]">
           Cantón:
          </label>
            <select
              id="dep"
              name="dep"
              className="peer block w-full cursor-pointer rounded-md border border-gray-200 py-2 pl-3 text-sm outline-2 placeholder:text-gray-500"
              aria-describedby="dep-error"
              value={selectedDep}
              onChange={(e) => setSelectedDep(e.target.value)}
            >
              <option value="" disabled>
                Seleccione un Cantón
              </option>
              {deps?.map((dep) => (
                <option key={dep.Nombre} value={dep.Nombre}>
                  {dep.Nombre}
                </option>
              ))}
            </select>
        </div>
        <div className="flex">
          <label htmlFor="student" className="mb-2 flex justify-end self-center pr-2 text-sm font-medium w-[100px]">
           Distrito:
          </label>
            <select
              id="dist"
              name="dist"
              className="peer block w-full cursor-pointer rounded-md border border-gray-200 py-2 pl-3 text-sm outline-2 placeholder:text-gray-500"
              defaultValue=""
              aria-describedby="dist-error"
            >
              <option value="" disabled>
                Seleccione un Distrito
              </option>
              {district?.map((dist) => (
                <option key={dist.Nombre} value={dist.Nombre}>
                  {dist.Nombre}
                </option>
              ))}
            </select>
        </div>
        <div className="flex">
          <label htmlFor="student" className="mb-2 flex justify-end self-center pr-2 text-sm font-medium w-[100px]">
           Barrio:
          </label>
            <input 
              id="barrio"
              name="barrio"
              className="peer block w-full cursor-pointer rounded-md border border-gray-200 py-2 pl-3 text-sm outline-2 placeholder:text-gray-500"
              aria-describedby="barrio-error"
              placeholder='Ingrese el Barrio'
            >
            </input>
        </div>
        <div className="flex">
          <label htmlFor="student" className="mb-2 flex justify-end self-center pr-2 text-sm font-medium w-[100px]">
           Señas:
          </label>
            <input
              id="senas"
              name="senas"
              className="peer block w-full cursor-pointer rounded-md border border-gray-200 py-2 pl-3 text-sm outline-2 placeholder:text-gray-500"
              aria-describedby="dist-error"
              placeholder='Dirección exacta'
            >
            </input>
        </div>
      </div>
    )
}

export function AddressUpdate(data) {
  const student=data.student;
  console.log(data);
  
  const countries=data.countries;

  const [selectedCountry, setSelectedCountry] = useState('');
  const [states, setStates] = useState([]);

  const [selectedState, setSelectedState] = useState('');
  const [deps, setDeps] = useState([]);

  const [selectedDep, setSelectedDep] = useState('');
  const [district, setDistrict] = useState([]);

  useEffect(() => { 

    const fetchStates = () => {
      if (selectedCountry) {
        countries?.map((country) => {
          if (selectedCountry == country.name) {
            setStates(country.states);
          }})
      }
    };

    fetchStates();
            
  }, [selectedCountry]);

  useEffect(() => {

    const fetchDeps = () => {
      if (selectedState) {
        states.map((state) => {
        if (selectedState == state.name) {
          setDeps(state.dep);
        }})
      }
    };

    fetchDeps();
    
  }, [selectedState]);

  useEffect(() => {

    const fetchDistrict = () => {
      if (selectedDep) {
        deps.map((dep) => {
        if (selectedDep == dep.Nombre) {
          setDistrict(dep.dist);
        }})
      }
    };

    fetchDistrict();
    
  }, [selectedDep]);


    return (
      <div> 
        {student?.map((stud) => {
          return(
          
          <div className="relative">
            <div className="flex">
              <label htmlFor="student" className="mb-2 justify-end self-center pr-2 flex text-sm font-medium w-[100px]">
                País:
              </label>
              <select
                  id="country"
                  name="country"
                  className="peer block w-full cursor-pointer rounded-md border border-gray-200 py-2 pl-3 text-sm outline-2 placeholder:text-gray-500"
                  aria-describedby="country-error"
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                >
                  <option value={stud.datos.country} >
                    {stud.datos.country}
                  </option>
                  {countries?.map((country) => (
                    <option key={country.code} value={country.name}>
                      {country.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex">
              <label htmlFor="student" className="mb-2 flex justify-end self-center pr-2 text-sm font-medium w-[100px]">
              Provincia:
              </label>
                <select
                  id="state"
                  name="state"
                  className="peer block w-full cursor-pointer rounded-md border border-gray-200 py-2 pl-3 text-sm outline-2 placeholder:text-gray-500"
                  aria-describedby="state-error"
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                >
                  <option value={stud.datos.state}>
                    {stud.datos.state}
                  </option>
                  {states?.map((state) => (
                    <option key={state.name} value={state.name}>
                      {state.name}
                    </option>
                  ))}
                </select>
            </div>
            <div className="flex">
              <label htmlFor="student" className="mb-2 flex justify-end self-center pr-2 text-sm font-medium w-[100px]">
              Cantón:
              </label>
                <select
                  id="dep"
                  name="dep"
                  className="peer block w-full cursor-pointer rounded-md border border-gray-200 py-2 pl-3 text-sm outline-2 placeholder:text-gray-500"
                  aria-describedby="dep-error"
                  value={selectedDep}
                  onChange={(e) => setSelectedDep(e.target.value)}
                >
                  <option value={stud.datos.dep}>
                    {stud.datos.dep}
                  </option>
                  {deps?.map((dep) => (
                    <option key={dep.Nombre} value={dep.Nombre}>
                      {dep.Nombre}
                    </option>
                  ))}
                </select>
            </div>
            <div className="flex">
              <label htmlFor="student" className="mb-2 flex justify-end self-center pr-2 text-sm font-medium w-[100px]">
              Distrito:
              </label>
                <select
                  id="dist"
                  name="dist"
                  className="peer block w-full cursor-pointer rounded-md border border-gray-200 py-2 pl-3 text-sm outline-2 placeholder:text-gray-500"
                  aria-describedby="dist-error"
                >
                  <option value={stud.datos.district}>
                    {stud.datos.district}
                  </option>
                  {district?.map((dist) => (
                    <option key={dist.Nombre} value={dist.Nombre}>
                      {dist.Nombre}
                    </option>
                  ))}
                </select>
            </div>
            <div className="flex">
              <label htmlFor="student" className="mb-2 flex justify-end self-center pr-2 text-sm font-medium w-[100px]">
              Barrio:
              </label>
                <input 
                  id="barrio"
                  name="barrio"
                  className="peer block w-full cursor-pointer rounded-md border border-gray-200 py-2 pl-3 text-sm outline-2 placeholder:text-gray-500"
                  aria-describedby="barrio-error"
                  defaultValue={stud.datos.ward}
                >
                </input>
            </div>
            <div className="flex">
              <label htmlFor="student" className="mb-2 flex justify-end self-center pr-2 text-sm font-medium w-[100px]">
              Señas:
              </label>
                <input
                  id="senas"
                  name="senas"
                  className="peer block w-full cursor-pointer rounded-md border border-gray-200 py-2 pl-3 text-sm outline-2 placeholder:text-gray-500"
                  aria-describedby="dist-error"
                  defaultValue={stud.datos.street}
                >
                </input>
            </div>
          </div>
    )})}
    </div>
    )
}