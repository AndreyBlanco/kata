
import getCountries from '@/app/ui/students/data';

export default function Address() {
    const countries = getCountries();
    return(
    <div className="relative">
            <select
              id="country"
              name="country"
              className="peer block w-full cursor-pointer rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
              defaultValue=""
              aria-describedby="country-error"
            >
              <option value="" disabled>
                Seleccione un País
              </option>
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
            <select
              id="state"
              name="state"
              className="peer block w-full cursor-pointer rounded-md border border-gray-200 py-2 pl-10 text-sm outline-2 placeholder:text-gray-500"
              defaultValue=""
              aria-describedby="state-error"
            >
              <option value="" disabled>
                Seleccione una Provincia/Estado
              </option>
              {/*states.map((state) => (
                <option key={state.id} value={state.id}>
                  {state.name}
                </option>
              ))*/}
            </select>
        </div>
    )
}